/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Logger } from '@kbn/logging';
import type {
  CoreSecurityDelegateServiceAccounts,
  ResolvedServiceAccountWorkload,
  ServiceAccountWorkloadDetails,
  ServiceAccountWorkloadLocator,
  ServiceAccountWorkloadResolver,
} from '@kbn/core-security-server';
import { addSpaceIdToPath, asSpaceId, getSpaceUrlPrefix } from '@kbn/core-spaces-common';
import type { WorkloadTypeRegistry } from './workload_type_registry';

/**
 * How long Core waits for one workload type to resolve its workloads before it gives up on them.
 */
export const WORKLOAD_RESOLUTION_TIMEOUT_MS = 30_000;

const APP_PATH_PREFIX = '/app/';
const DUMMY_ORIGIN = 'http://kibana.invalid';
const UNSAFE_PATH_CHARACTERS = /[\s\u0000-\u001f\u007f\\]/;

const getPathname = (path: string): string => path.split(/[?#]/, 1)[0];

/**
 * Whether every segment of a pathname stays the segment it looks like. A segment that decodes to
 * `.` or `..`, or to something with a separator in it, could move the link out of the app once a
 * browser or proxy normalizes it, so it fails, and so does a malformed escape.
 */
const hasPlainSegments = (pathname: string): boolean => {
  const segments = pathname.split('/').slice(1);
  return segments.every((segment, index) => {
    if (segment === '') {
      return index === segments.length - 1;
    }

    let decoded: string;
    try {
      decoded = decodeURIComponent(segment);
    } catch {
      return false;
    }

    return decoded !== '.' && decoded !== '..' && !decoded.includes('/') && !decoded.includes('\\');
  });
};

/**
 * Builds the link to a workload from the app path its workload type returned: the base path, then
 * the space of the binding, then the path. Returns `undefined` unless the path is a plain `/app/`
 * path and the link it produces still lands in that space and under `/app/` once a URL parser
 * normalizes it.
 */
export const buildWorkloadHref = (
  serverBasePath: string,
  spaceId: string,
  path: unknown
): string | undefined => {
  if (
    typeof path !== 'string' ||
    !path.startsWith(APP_PATH_PREFIX) ||
    UNSAFE_PATH_CHARACTERS.test(path) ||
    !hasPlainSegments(getPathname(path))
  ) {
    return undefined;
  }

  let spacePrefix: string;
  try {
    spacePrefix = getSpaceUrlPrefix(asSpaceId(spaceId));
  } catch {
    return undefined;
  }

  const basePath = serverBasePath.endsWith('/') ? serverBasePath.slice(0, -1) : serverBasePath;
  const href = addSpaceIdToPath(basePath, spaceId, path);
  const hrefPathname = getPathname(href);

  let url: URL;
  try {
    url = new URL(href, DUMMY_ORIGIN);
  } catch {
    return undefined;
  }

  if (
    url.origin !== DUMMY_ORIGIN ||
    url.pathname !== hrefPathname ||
    !hrefPathname.startsWith(`${basePath}${spacePrefix}${APP_PATH_PREFIX}`)
  ) {
    return undefined;
  }

  return href;
};

const isNonBlankString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

/**
 * Turns what a workload type returned for one workload into what the security provider gets.
 * Returns `null` when the workload type returned a path Core cannot link to, so the caller can
 * drop the entry and count it.
 */
const toResolvedWorkload = (
  serverBasePath: string,
  { spaceId }: ServiceAccountWorkloadLocator,
  details: ServiceAccountWorkloadDetails | undefined
): ResolvedServiceAccountWorkload | null => {
  if (!details || typeof details !== 'object') {
    return {};
  }

  const { title, path } = details;
  const resolved: ResolvedServiceAccountWorkload = {};

  if (path !== undefined) {
    const href = buildWorkloadHref(serverBasePath, spaceId, path);
    if (href === undefined) {
      return null;
    }
    resolved.href = href;
  }

  if (isNonBlankString(title)) {
    resolved.title = title;
  }

  return resolved;
};

/**
 * Calls a resolver once, giving up after `timeoutMs`. On timeout it aborts the signal it passed
 * in, and whatever the resolver returns later is ignored.
 */
const callWithTimeout = async (
  resolver: ServiceAccountWorkloadResolver,
  workloads: ServiceAccountWorkloadLocator[],
  timeoutMs: number
): Promise<unknown> => {
  const controller = new AbortController();
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      const error = new Error(`Timed out after ${timeoutMs}ms.`);
      controller.abort(error);
      reject(error);
    }, timeoutMs);
  });

  try {
    return await Promise.race([
      Promise.resolve().then(() => resolver(workloads, { signal: controller.signal })),
      timeout,
    ]);
  } finally {
    clearTimeout(timer);
  }
};

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
}: {
  registry: WorkloadTypeRegistry;
  serverBasePath: string;
  logger: Logger;
  timeoutMs?: number;
}): CoreSecurityDelegateServiceAccounts['resolveBoundWorkloads'] => {
  return async (bindings) => {
    const results: ResolvedServiceAccountWorkload[] = bindings.map(() => ({}));

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

        let details: unknown;
        try {
          details = await callWithTimeout(resolver, workloads, timeoutMs);
        } catch (error) {
          logger.warn(
            `Unable to resolve ${workloads.length} workload(s) of type [${workloadType}] registered by plugin [${pluginId}]: ${error.message}`
          );
          return;
        }

        if (!Array.isArray(details) || details.length !== workloads.length) {
          logger.warn(
            `Workload type [${workloadType}] registered by plugin [${pluginId}] returned an unexpected result for ${workloads.length} workload(s), ignoring it.`
          );
          return;
        }

        let rejectedPaths = 0;
        indices.forEach((index, position) => {
          const resolved = toResolvedWorkload(
            serverBasePath,
            workloads[position],
            details[position]
          );
          if (resolved === null) {
            rejectedPaths++;
            return;
          }
          results[index] = resolved;
        });

        if (rejectedPaths > 0) {
          logger.warn(
            `Workload type [${workloadType}] registered by plugin [${pluginId}] returned ${rejectedPaths} path(s) that are not plain /app/ paths, ignoring those workloads.`
          );
        }
      })
    );

    return results;
  };
};
