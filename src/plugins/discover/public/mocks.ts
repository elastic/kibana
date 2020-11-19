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

import { DiscoverSetup, DiscoverStart } from '.';

export type Setup = jest.Mocked<DiscoverSetup>;
export type Start = jest.Mocked<DiscoverStart>;

const createSetupContract = (): Setup => {
  const setupContract: Setup = {
    docViews: {
      addDocView: jest.fn(),
    },
  };
  return setupContract;
};

const createStartContract = (): Start => {
  const startContract: Start = {
    savedSearchLoader: {} as any,
    urlGenerator: {
      createUrl: jest.fn(),
    } as any,
  };
  return startContract;
};

export const discoverPluginMock = {
  createSetupContract,
  createStartContract,
};
