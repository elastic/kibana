/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Attributes, Counter, Histogram, Meter } from '@opentelemetry/api';
import { metrics, ValueType } from '@opentelemetry/api';
import type { Logger } from '@kbn/logging';
import type {
  CoreSecurityDelegateServiceAccounts,
  ResolvedServiceAccountWorkload,
  ServiceAccountWorkloadLocator,
  ServiceAccountWorkloadResolver,
} from '@kbn/core-security-server';
import { addSpaceIdToPath, asSpaceId, getSpaceUrlPrefix } from '@kbn/core-spaces-common';
import { isInternalURL } from '@kbn/std';
import type { WorkloadTypeRegistry } from './workload_type_registry';

/**
 * How long Core waits for one workload type to resolve its workloads before it gives up on them.
 */
export const WORKLOAD_RESOLUTION_TIMEOUT_MS = 10_000;

/** Scope of the meter that records how workload types resolve their workloads. */
export const WORKLOAD_RESOLUTION_METER_NAME = 'kibana.security.service_accounts';

const APP_PATH_PREFIX = '/app/';
/** Kept out of links so a raw control character never reaches an `href`. */
const UNSAFE_PATH_CHARACTERS = /[\s\u0000-\u001f\u007f\\]/;

/**
 * Builds the link to a workload from the app path its workload type returned: the base path, then
 * the space of the binding, then the path. Returns `undefined` unless the path starts with `/app/`
 * and the link it produces still lands in that space and under `/app` once a URL parser normalizes
 * it, which also rules out literal and encoded dot segments that climb out of it.
 */
export const buildWorkloadHref = (
  serverBasePath: string,
  spaceId: string,
  path: unknown
): string | undefined => {
  if (
    typeof path !== 'string' ||
    !path.startsWith(APP_PATH_PREFIX) ||
    UNSAFE_PATH_CHARACTERS.test(path)
  ) {
    return undefined;
  }

  let spacePrefix: string;
  try {
    spacePrefix = getSpaceUrlPrefix(asSpaceId(spaceId));
  } catch {
    return undefined;
  }

  const href = addSpaceIdToPath(serverBasePath, spaceId, path);
  return isInternalURL(href, `${serverBasePath.replace(/\/$/, '')}${spacePrefix}/app`)
    ? href
    : undefined;
};

const isNonBlankString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

/**
 * Turns what a workload type returned for one workload into what the security provider gets.
 * Returns `null` for an entry that is not a valid status, so the caller can reject the whole
 * result. A present workload whose path Core cannot link to keeps its status, without a title or
 * a link, and is reported through `onRejectedPath`.
 */
const toResolvedWorkload = (
  serverBasePath: string,
  { spaceId }: ServiceAccountWorkloadLocator,
  details: unknown,
  onRejectedPath: () => void
): ResolvedServiceAccountWorkload | null => {
  if (!details || typeof details !== 'object') {
    return null;
  }

  const status = 'status' in details ? details.status : undefined;
  const title = 'title' in details ? details.title : undefined;
  const path = 'path' in details ? details.path : undefined;
  if (status === 'missing' || status === 'unknown') {
    return { status };
  }
  if (status !== 'present') {
    return null;
  }

  if (path !== undefined) {
    const href = buildWorkloadHref(serverBasePath, spaceId, path);
    if (href === undefined) {
      onRejectedPath();
      return { status };
    }
    return isNonBlankString(title) ? { status, title, href } : { status, href };
  }

  return isNonBlankString(title) ? { status, title } : { status };
};

/** Why Core stopped waiting for a resolver. */
class WorkloadResolutionStoppedError extends Error {
  constructor(public readonly reason: 'timeout' | 'aborted', message: string) {
    super(message);
  }
}

const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

/**
 * The instruments that record each resolver call, so the timeout can be tuned from real numbers.
 */
interface WorkloadResolutionMetrics {
  duration: Histogram;
  batchSize: Histogram;
  unknown: Counter;
}

const createWorkloadResolutionMetrics = (meter: Meter): WorkloadResolutionMetrics => ({
  duration: meter.createHistogram('kibana.security.service_accounts.workload_resolution.duration', {
    description: 'Time a workload type took to resolve the bound workloads it was asked for.',
    unit: 's',
    valueType: ValueType.DOUBLE,
    advice: {
      explicitBucketBoundaries: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 7.5, 10],
    },
  }),
  batchSize: meter.createHistogram(
    'kibana.security.service_accounts.workload_resolution.batch.size',
    {
      description: 'Number of bound workloads a workload type was asked to resolve in one call.',
      unit: '{workload}',
      valueType: ValueType.INT,
      advice: { explicitBucketBoundaries: [1, 5, 10, 25, 50, 100, 250, 500, 1000, 2500] },
    }
  ),
  unknown: meter.createCounter('kibana.security.service_accounts.workload_resolution.unknown', {
    description:
      'Number of bound workloads a workload type could not say exist or not, because it failed or answered unknown.',
    unit: '{workload}',
    valueType: ValueType.INT,
  }),
});

/**
 * Calls a resolver once. Gives up after `timeoutMs`, or as soon as `callerSignal` aborts, and then
 * aborts the signal it passed in. Whatever the resolver returns later is ignored.
 */
const callResolver = async (
  resolver: ServiceAccountWorkloadResolver,
  workloads: ServiceAccountWorkloadLocator[],
  timeoutMs: number,
  callerSignal: AbortSignal | undefined
): Promise<unknown> => {
  if (callerSignal?.aborted) {
    throw new WorkloadResolutionStoppedError('aborted', 'Aborted before the call.');
  }

  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let onCallerAbort: (() => void) | undefined;
  const stopped = new Promise<never>((_, reject) => {
    const stop = (error: Error) => {
      controller.abort(error);
      reject(error);
    };
    timer = setTimeout(
      () => stop(new WorkloadResolutionStoppedError('timeout', `Timed out after ${timeoutMs}ms.`)),
      timeoutMs
    );
    onCallerAbort = () =>
      stop(new WorkloadResolutionStoppedError('aborted', 'Aborted by the caller.'));
    callerSignal?.addEventListener('abort', onCallerAbort, { once: true });
  });

  try {
    return await Promise.race([
      Promise.resolve().then(() => resolver(workloads, { signal: controller.signal })),
      stopped,
    ]);
  } finally {
    clearTimeout(timer);
    if (onCallerAbort) {
      callerSignal?.removeEventListener('abort', onCallerAbort);
    }
  }
};

const isComplete = (
  entries: Array<ResolvedServiceAccountWorkload | null>
): entries is ResolvedServiceAccountWorkload[] => !entries.includes(null);

const getErrorType = (error: unknown): string =>
  error instanceof WorkloadResolutionStoppedError ? error.reason : '_OTHER';

interface WorkloadGroup {
  pluginId: string;
  workloadType: string;
  resolver: ServiceAccountWorkloadResolver;
  indices: number[];
}

/**
 * Creates the `resolveBoundWorkloads` Core hands to the security provider. It calls each workload
 * type's resolver once for that type's bindings, and builds each link from the base path, the space
 * of the binding and the path the resolver returned.
 */
export const createBoundWorkloadResolver = ({
  registry,
  serverBasePath,
  logger,
  timeoutMs = WORKLOAD_RESOLUTION_TIMEOUT_MS,
  meter = metrics.getMeter(WORKLOAD_RESOLUTION_METER_NAME),
}: {
  registry: WorkloadTypeRegistry;
  serverBasePath: string;
  logger: Logger;
  timeoutMs?: number;
  meter?: Meter;
}): CoreSecurityDelegateServiceAccounts['resolveBoundWorkloads'] => {
  const { duration, batchSize, unknown } = createWorkloadResolutionMetrics(meter);

  return async (bindings, { signal, purpose = 'display' } = {}) => {
    const results: ResolvedServiceAccountWorkload[] = bindings.map(() => ({ status: 'unknown' }));

    const groups = new Map<string, WorkloadGroup>();
    bindings.forEach(({ pluginId, workloadType }, index) => {
      const resolver = registry.get(pluginId, workloadType)?.resolveWorkloads;
      if (!resolver) {
        return;
      }

      const key = JSON.stringify([pluginId, workloadType]);
      const group = groups.get(key) ?? { pluginId, workloadType, resolver, indices: [] };
      group.indices.push(index);
      groups.set(key, group);
    });

    await Promise.all(
      [...groups.values()].map(async ({ pluginId, workloadType, resolver, indices }) => {
        const workloads = indices.map((index) => ({
          workloadId: bindings[index].workloadId,
          spaceId: bindings[index].spaceId,
        }));

        const attributes: Attributes = {
          'kibana.plugin.id': pluginId,
          'kibana.service_account.workload.type': workloadType,
          'kibana.service_account.workload_resolution.purpose': purpose,
        };
        batchSize.record(workloads.length, attributes);
        const start = performance.now();
        const recordFailure = (errorType: string) => {
          duration.record((performance.now() - start) / 1000, {
            ...attributes,
            'error.type': errorType,
          });
          unknown.add(workloads.length, { ...attributes, 'error.type': errorType });
        };

        let details: unknown;
        try {
          details = await callResolver(resolver, workloads, timeoutMs, signal);
        } catch (error) {
          recordFailure(getErrorType(error));
          logger.warn(
            `Unable to resolve ${
              workloads.length
            } workload(s) of type [${workloadType}] registered by plugin [${pluginId}]: ${getErrorMessage(
              error
            )}`
          );
          return;
        }

        let rejectedPaths = 0;
        const resolved =
          Array.isArray(details) && details.length === workloads.length
            ? workloads.map((workload, position) =>
                toResolvedWorkload(serverBasePath, workload, details[position], () => {
                  rejectedPaths++;
                })
              )
            : null;

        // One malformed entry discards the whole result: a resolver that gets the shape wrong
        // cannot be trusted to have the statuses right, and `missing` deletes bindings.
        if (resolved === null || !isComplete(resolved)) {
          recordFailure('invalid_result');
          logger.warn(
            `Workload type [${workloadType}] registered by plugin [${pluginId}] returned an unexpected result for ${workloads.length} workload(s), ignoring it.`
          );
          return;
        }

        duration.record((performance.now() - start) / 1000, attributes);

        let reportedUnknown = 0;
        indices.forEach((index, position) => {
          const entry = resolved[position];
          if (entry.status === 'unknown') {
            reportedUnknown++;
          }
          results[index] = entry;
        });

        if (reportedUnknown > 0) {
          unknown.add(reportedUnknown, attributes);
        }

        if (rejectedPaths > 0) {
          logger.warn(
            `Workload type [${workloadType}] registered by plugin [${pluginId}] returned ${rejectedPaths} path(s) that Core cannot link to, showing those workloads without a title or a link.`
          );
        }
      })
    );

    return results;
  };
};
