/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { cloneDeep } from 'lodash';
import { withSpan } from '@kbn/apm-utils';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { Capabilities } from '@kbn/core-capabilities-common';
import type { SwitcherWithOptions } from './types';

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

export const getCapabilitiesResolver =
  (
    capabilities: () => Capabilities,
    switchers: () => SwitcherWithOptions[]
  ): CapabilitiesResolver =>
  async ({
    request,
    capabilityPath,
    applications,
    useDefaultCapabilities,
  }): Promise<Capabilities> => {
    return withSpan({ name: 'resolve capabilities', type: 'capabilities' }, () =>
      resolveCapabilities({
        capabilities: capabilities(),
        switchers: switchers(),
        request,
        capabilityPath,
        applications,
        useDefaultCapabilities,
      })
    );
  };

export const resolveCapabilities = async ({
  capabilities,
  switchers,
  request,
  capabilityPath,
  applications,
  useDefaultCapabilities,
}: {
  capabilities: Capabilities;
  switchers: SwitcherWithOptions[];
  request: KibanaRequest;
  applications: string[];
  capabilityPath: string[];
  useDefaultCapabilities: boolean;
}): Promise<Capabilities> => {
  const mergedCaps: Capabilities = cloneDeep({
    ...capabilities,
    navLinks: applications.reduce((acc, app) => {
      acc[app] = true;
      return acc;
    }, capabilities.navLinks),
  });

  return switchers.reduce(async (caps, switcher) => {
    const resolvedCaps = await caps;
    const changes = await switcher.switcher(request, resolvedCaps, useDefaultCapabilities);
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
