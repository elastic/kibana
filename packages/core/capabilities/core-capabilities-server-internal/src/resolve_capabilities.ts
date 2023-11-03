/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { cloneDeep, memoize, uniqueId } from 'lodash';
import { withSpan } from '@kbn/apm-utils';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { Capabilities } from '@kbn/core-capabilities-common';
import type { SwitcherWithOptions, SwitcherWithId } from './types';
import { pathsIntersect, splitIntoBuckets, convertBucketToSwitcher } from './resolve_helpers';

export type CapabilitiesResolver = ({
  request,
  capabilityPath,
  applications,
  useDefaultCapabilities,
}: {
  request: KibanaRequest;
  capabilityPath: string[];
  applications: string[];
  useDefaultCapabilities: boolean;
}) => Promise<Capabilities>;

type ForPathSwitcherResolver = (path: string, switchers: SwitcherWithId[]) => string[];

export const getCapabilitiesResolver = (
  getCapabilities: () => Capabilities,
  getSwitchers: () => SwitcherWithOptions[]
): CapabilitiesResolver => {
  let initialized = false;
  let capabilities: Capabilities;
  let switchers: Map<string, SwitcherWithId>;
  // memoize is on the first argument only by default, which is what we want here
  const getSwitcherForPath: ForPathSwitcherResolver = memoize(getSwitchersToUseForPath);

  // memoize is on the first argument only by default, which is what we want here
  // getSwitchersToUseForPath
  // (path: string, switchers: SwitcherWithId[]): string[]

  return async ({
    request,
    capabilityPath,
    applications,
    useDefaultCapabilities,
  }): Promise<Capabilities> => {
    if (!initialized) {
      capabilities = getCapabilities();
      switchers = new Map();
      getSwitchers().forEach((switcher) => {
        const switcherId = uniqueId('s-');
        switchers.set(switcherId, {
          id: switcherId,
          ...switcher,
        });
      });
      initialized = true;
    }

    return withSpan({ name: 'resolve capabilities', type: 'capabilities' }, () =>
      resolveCapabilities({
        capabilities,
        switchers,
        request,
        capabilityPath,
        applications,
        useDefaultCapabilities,
        getSwitcherForPath,
      })
    );
  };
};

const resolveCapabilities = async ({
  capabilities,
  switchers,
  request,
  capabilityPath,
  applications,
  useDefaultCapabilities,
  getSwitcherForPath,
}: {
  capabilities: Capabilities;
  switchers: Map<string, SwitcherWithId>;
  request: KibanaRequest;
  applications: string[];
  capabilityPath: string[]; // TODO: rename to plural
  useDefaultCapabilities: boolean;
  getSwitcherForPath: ForPathSwitcherResolver;
}): Promise<Capabilities> => {
  const mergedCaps: Capabilities = cloneDeep({
    ...capabilities,
    navLinks: applications.reduce((acc, app) => {
      acc[app] = true;
      return acc;
    }, capabilities.navLinks),
  });

  // find switchers that should be applied for the provided capabilityPaths
  const allSwitchers = [...switchers.values()];
  const switcherIdsToApply = new Set<string>();
  capabilityPath.forEach((path) => {
    getSwitcherForPath(path, allSwitchers).forEach((switcherId) =>
      switcherIdsToApply.add(switcherId)
    );
  });
  const switchersToApply = [...switcherIdsToApply].reduce((list, switcherId) => {
    list.push(switchers.get(switcherId)!);
    return list;
  }, [] as SwitcherWithId[]);

  // split the switchers into buckets for parallel execution
  const switcherBuckets = splitIntoBuckets(switchersToApply);

  // convert the multi-switcher buckets into switchers
  const convertedSwitchers = switcherBuckets.map(convertBucketToSwitcher);

  return convertedSwitchers.reduce(async (caps, switcher) => {
    const resolvedCaps = await caps;
    const changes = await switcher(request, resolvedCaps, useDefaultCapabilities);
    return recursiveApplyChanges(resolvedCaps, changes);
  }, Promise.resolve(mergedCaps));
};

function recursiveApplyChanges<
  TDestination extends Record<string, any>,
  TSource extends Record<string, any>
>(destination: TDestination, source: TSource): TDestination {
  return Object.keys(destination)
    .map((key) => {
      const orig = destination[key];
      const changed = source[key];
      if (changed == null) {
        return [key, orig];
      }
      if (typeof orig === 'object' && typeof changed === 'object') {
        return [key, recursiveApplyChanges(orig, changed)];
      }
      return [key, typeof orig === typeof changed ? changed : orig];
    })
    .reduce((acc, [key, value]) => {
      acc[key as keyof TDestination] = value;
      return acc;
    }, {} as TDestination);
}

const getSwitchersToUseForPath = (path: string, switchers: SwitcherWithId[]): string[] => {
  const switcherIds: string[] = [];
  switchers.forEach((switcher) => {
    if (
      switcher.capabilityPath.some((switcherPath) => {
        return pathsIntersect(path, switcherPath);
      })
    ) {
      switcherIds.push(switcher.id);
    }
  });
  return switcherIds;
};
