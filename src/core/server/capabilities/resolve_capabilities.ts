/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { cloneDeep } from 'lodash';
import { Capabilities, CapabilitiesSwitcher } from './types';
import { KibanaRequest } from '../http';

export type CapabilitiesResolver = (
  request: KibanaRequest,
  applications: string[]
) => Promise<Capabilities>;

export const getCapabilitiesResolver = (
  capabilities: () => Capabilities,
  switchers: () => CapabilitiesSwitcher[]
): CapabilitiesResolver => async (
  request: KibanaRequest,
  applications: string[]
): Promise<Capabilities> => {
  return resolveCapabilities(capabilities(), switchers(), request, applications);
};

export const resolveCapabilities = async (
  capabilities: Capabilities,
  switchers: CapabilitiesSwitcher[],
  request: KibanaRequest,
  applications: string[]
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
    const changes = await switcher(request, resolvedCaps);
    return recursiveApplyChanges(resolvedCaps, changes);
  }, Promise.resolve(mergedCaps));
};

function recursiveApplyChanges<
  TDestination extends Record<string, any>,
  TSource extends Record<string, any>
>(destination: TDestination, source: TSource): TDestination {
  return Object.keys(destination)
    .map(key => {
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
