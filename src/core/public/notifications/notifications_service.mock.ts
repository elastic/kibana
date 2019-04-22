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
import { NotificationsService, NotificationsSetup } from './notifications_service';
import { toastsServiceMock } from './toasts/toasts_service.mock';
import { ToastsSetup } from './toasts/toasts_start';

const createSetupContractMock = () => {
  const setupContract: jest.Mocked<NotificationsSetup> = {
    // we have to suppress type errors until decide how to mock es6 class
    toasts: (toastsServiceMock.createSetupContract() as unknown) as ToastsSetup,
  };
  return setupContract;
};

type NotificationsServiceContract = PublicMethodsOf<NotificationsService>;
const createMock = () => {
  const mocked: jest.Mocked<NotificationsServiceContract> = {
    setup: jest.fn(),
    stop: jest.fn(),
  };
  mocked.setup.mockReturnValue(createSetupContractMock());
  return mocked;
};

export const notificationServiceMock = {
  create: createMock,
  createSetupContract: createSetupContractMock,
};
