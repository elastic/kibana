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

import { Capabilities, CapabilitiesSwitcher } from './types';
import { KibanaRequest } from '../http';

export type CapabilitiesResolver = (request: KibanaRequest) => Promise<Capabilities>;

export const getCapabilitiesResolver = (
  capabilities: () => Capabilities,
  switchers: () => CapabilitiesSwitcher[]
): CapabilitiesResolver => async (request: KibanaRequest): Promise<Capabilities> => {
  return resolveCapabilities(capabilities(), switchers(), request);
};

export const resolveCapabilities = async (
  capabilities: Capabilities,
  switchers: CapabilitiesSwitcher[],
  request: KibanaRequest
): Promise<Capabilities> => {
  return switchers.reduce(async (caps, switcher) => {
    return switcher(request, await caps);
  }, Promise.resolve(capabilities));
};
