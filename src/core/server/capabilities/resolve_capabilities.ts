/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { cloneDeep } from 'lodash';
import { Capabilities, CapabilitiesSwitcher } from './types';
import { KibanaRequest } from '../http';

export type CapabilitiesResolver = (
  request: KibanaRequest,
  applications: string[],
  useDefaultCapabilities: boolean
) => Promise<Capabilities>;

export const getCapabilitiesResolver =
  (
    capabilities: () => Capabilities,
    switchers: () => CapabilitiesSwitcher[]
  ): CapabilitiesResolver =>
  async (
    request: KibanaRequest,
    applications: string[],
    useDefaultCapabilities: boolean
  ): Promise<Capabilities> => {
    return resolveCapabilities(
      capabilities(),
      switchers(),
      request,
      applications,
      useDefaultCapabilities
    );
  };

export const resolveCapabilities = async (
  capabilities: Capabilities,
  switchers: CapabilitiesSwitcher[],
  request: KibanaRequest,
  applications: string[],
  useDefaultCapabilities: boolean
): Promise<Capabilities> => {
  const mergedCaps = cloneDeep({
    ...capabilities,
    navLinks: applications.reduce(
      (acc, app) => ({
        ...acc,
        [app]: true,
      }),
      capabilities.navLinks
    ),
  });
  return switchers.reduce(async (caps, switcher) => {
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
    .reduce(
      (acc, [key, value]) => ({
        ...acc,
        [key]: value,
      }),
      {} as TDestination
    );
}
