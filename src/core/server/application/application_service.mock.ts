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

import { ApplicationServiceSetup } from './types';
import { ApplicationService } from './application_service';
import { applicationContextProviderMock } from './application_context_provider.mock';

type ApplicationServiceMock = jest.Mocked<PublicMethodsOf<ApplicationService>>;
type ApplicationServiceSetupMock = jest.Mocked<ApplicationServiceSetup>;

const createSetupContractMock = (): ApplicationServiceSetupMock => ({
  getCoreContextProvider: jest.fn().mockResolvedValue(applicationContextProviderMock.create()),
});
const createApplicationServiceMock = (): ApplicationServiceMock => ({
  setup: jest.fn().mockResolvedValue(createSetupContractMock()),
  start: jest.fn(),
  stop: jest.fn(),
});

export const applicationServiceMock = {
  create: createApplicationServiceMock,
  createSetupContract: createSetupContractMock,
};
