/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  HousekeepingFindingGroup,
  HousekeepingFindingKind,
  HousekeepingResource,
  HousekeepingFindingsResponse,
  HousekeepingScope,
  HousekeepingSkippedCheck,
} from '../common';
import { HOUSEKEEPING_FINDING_KINDS, isFindingInScope } from '../common';
import { buildGraphFindings, createLocateResource } from './graph';
import type { ProviderResult } from './graph';
import type { HousekeepingRegistry } from './registry';
import type {
  HousekeepingCheck,
  HousekeepingCheckFinding,
  HousekeepingContext,
  HousekeepingResourceProvider,
} from './types';

export const DEFAULT_TIMEOUT_MS = 30_000;

/** What the reference graph reports. */
const GRAPH_KINDS: HousekeepingFindingKind[] = ['broken_reference', 'unused'];

class TimeoutError extends Error {}

/**
 * Runs a provider or check with its own abort signal, which aborts when it times out so its
 * requests stop too. A call that throws before returning a promise fails like one that rejects.
 */
const runWithTimeout = <T>(
  run: (abortSignal: AbortSignal) => Promise<T>,
  parentSignal: AbortSignal,
  timeoutMs: number
): Promise<T> => {
  const controller = new AbortController();
  const abort = () => controller.abort();
  parentSignal.addEventListener('abort', abort);

  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new TimeoutError(`Did not finish within ${timeoutMs}ms`));
    }, timeoutMs);
  });
  const result = Promise.resolve().then(() => run(controller.signal));

  return Promise.race([result, timeout]).finally(() => {
    clearTimeout(timer);
    parentSignal.removeEventListener('abort', abort);
  });
};

/** Shares a response by key; callers that use the same key expect the same type. */
const createFetchOnce = (abortSignal: AbortSignal) => {
  const cache = new Map<string, Promise<unknown>>();
  return <T>(key: string, fetch: (signal: AbortSignal) => Promise<T>): Promise<T> => {
    const cached = cache.get(key);
    if (cached) {
      return cached as Promise<T>;
    }
    const promise = Promise.resolve().then(() => fetch(abortSignal));
    cache.set(key, promise);
    return promise;
  };
};

const toSkipped = (
  { id, title }: { id: string; title: string },
  error: unknown
): HousekeepingSkippedCheck => ({
  checkId: id,
  checkTitle: title,
  reason: error instanceof TimeoutError ? 'timeout' : 'error',
  message: error instanceof Error ? error.message : String(error),
});

const owns = (provider: HousekeepingResourceProvider, types: string[]) =>
  provider.resourceTypes.some(({ id }) => types.includes(id));

const references = (provider: HousekeepingResourceProvider, types: string[]) =>
  provider.referencedTypes?.some((type) => types.includes(type)) ?? false;

/**
 * A scoped run needs the providers of the scope, the ones that reference it, and the owners of
 * whatever those reference, so every reference can be judged.
 */
export const selectProviders = (
  providers: HousekeepingResourceProvider[],
  resourceTypes?: string[]
) => {
  if (!resourceTypes?.length) {
    return providers;
  }

  const selected = new Set(
    providers.filter(
      (provider) => owns(provider, resourceTypes) || references(provider, resourceTypes)
    )
  );
  const targetTypes = [...selected].flatMap((provider) => provider.referencedTypes ?? []);
  const ownedTypes = [...selected].flatMap(({ resourceTypes: types }) => types.map(({ id }) => id));
  for (const provider of providers) {
    if (owns(provider, targetTypes) || references(provider, ownedTypes)) {
      selected.add(provider);
    }
  }
  return providers.filter((provider) => selected.has(provider));
};

const toGroup = (
  check: HousekeepingCheck,
  findings: HousekeepingCheckFinding[],
  locateResource: (resource: HousekeepingResource) => HousekeepingResource
): HousekeepingFindingGroup => ({
  id: check.id,
  kind: check.kind ?? 'risk',
  title: check.title,
  description: check.description,
  findings: findings.map((finding) => ({
    ...finding,
    resource: locateResource(finding.resource),
    id: [
      check.id,
      `${finding.resource.type}:${finding.resource.id}`,
      ...finding.related.map(({ type, id }) => `${type}:${id}`),
    ].join('|'),
  })),
});

interface RunHousekeepingOptions {
  registry: HousekeepingRegistry;
  context: Omit<HousekeepingContext, 'abortSignal' | 'fetchOnce'>;
  abortSignal: AbortSignal;
  scope?: HousekeepingScope;
  timeoutMs?: number;
}

export const runHousekeeping = async ({
  registry,
  context,
  abortSignal,
  scope = {},
  timeoutMs = DEFAULT_TIMEOUT_MS,
}: RunHousekeepingOptions): Promise<HousekeepingFindingsResponse> => {
  const controller = new AbortController();
  const abort = () => controller.abort();
  abortSignal.addEventListener('abort', abort);

  const runContext: HousekeepingContext = {
    ...context,
    abortSignal: controller.signal,
    fetchOnce: createFetchOnce(controller.signal),
  };
  const withSignal = (signal: AbortSignal) => ({ ...runContext, abortSignal: signal });

  const allProviders = registry.getProviders();
  const isAvailable = (item: {
    id: string;
    isAvailable?(context: HousekeepingContext): boolean;
  }) => {
    try {
      return item.isAvailable?.(runContext) ?? true;
    } catch (error) {
      context.logger.debug(`Housekeeping [${item.id}] availability failed: ${error}`);
      return false;
    }
  };

  const scopedTypes = scope.resourceTypes;
  const availableProviders = allProviders.filter(isAvailable);
  const providers = selectProviders(availableProviders, scopedTypes);
  const checks = registry
    .getChecks()
    .filter(
      (check) =>
        (!scopedTypes?.length || check.resourceTypes.some((type) => scopedTypes.includes(type))) &&
        isAvailable(check)
    );

  try {
    const [providerResults, checkResults] = await Promise.all([
      Promise.allSettled(
        providers.map((provider) =>
          runWithTimeout(
            (signal) => provider.listResources(withSignal(signal)),
            controller.signal,
            timeoutMs
          )
        )
      ),
      Promise.allSettled(
        checks.map((check) =>
          runWithTimeout((signal) => check.run(withSignal(signal)), controller.signal, timeoutMs)
        )
      ),
    ]);

    const skipped: HousekeepingSkippedCheck[] = [];
    const results: ProviderResult[] = providerResults.map((result, index) => {
      const provider = providers[index];
      if (result.status === 'fulfilled') {
        const { resources, unusedNotChecked } = Array.isArray(result.value)
          ? { resources: result.value, unusedNotChecked: undefined }
          : result.value;
        return { provider, resources, unusedNotChecked };
      }
      context.logger.debug(`Housekeeping provider [${provider.id}] failed: ${result.reason}`);
      skipped.push(toSkipped(provider, result.reason));
      return { provider };
    });

    const resourceTypes = registry.getResourceTypes();
    const locateResource = createLocateResource(resourceTypes);
    const graph = buildGraphFindings({
      results,
      providers: availableProviders,
      resourceTypes,
      logger: context.logger,
    });
    const groups: HousekeepingFindingGroup[] = [...graph.groups];
    skipped.push(...graph.skipped);

    checkResults.forEach((result, index) => {
      const check = checks[index];
      if (result.status === 'fulfilled') {
        groups.push(toGroup(check, result.value, locateResource));
        return;
      }
      context.logger.debug(`Housekeeping check [${check.id}] failed: ${result.reason}`);
      skipped.push(toSkipped(check, result.reason));
    });

    const scoped = groups
      .map((group) => ({
        ...group,
        findings: group.findings.filter(
          (finding) => !finding.resource.isManaged && isFindingInScope(finding, scope)
        ),
      }))
      .filter(({ findings }) => findings.length > 0)
      .sort(
        (a, b) =>
          HOUSEKEEPING_FINDING_KINDS.indexOf(a.kind) - HOUSEKEEPING_FINDING_KINDS.indexOf(b.kind)
      );

    const summary = { broken_reference: 0, deprecation: 0, risk: 0, unused: 0 };
    for (const { kind, findings } of scoped) {
      summary[kind] += findings.length;
    }

    return {
      kinds: HOUSEKEEPING_FINDING_KINDS.filter(
        (kind) =>
          (providers.length > 0 && GRAPH_KINDS.includes(kind)) ||
          checks.some((check) => (check.kind ?? 'risk') === kind)
      ),
      groups: scoped,
      summary,
      skipped,
      resourceTypes: Object.fromEntries(resourceTypes.map(({ id, label }) => [id, { label }])),
    };
  } finally {
    abortSignal.removeEventListener('abort', abort);
    controller.abort();
  }
};
