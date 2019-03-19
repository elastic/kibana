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
import { NotificationsService, NotificationsStart } from './notifications_service';
import { toastsServiceMock } from './toasts/toasts_service.mock';
import { ToastsStart } from './toasts/toasts_start';

const createStartContractMock = () => {
  const startContract: jest.Mocked<NotificationsStart> = {
    // we have to suppress type errors until decide how to mock es6 class
    toasts: (toastsServiceMock.createStartContract() as unknown) as ToastsStart,
  };
  return startContract;
};

type NotificationsServiceContract = PublicMethodsOf<NotificationsService>;
const createMock = () => {
  const mocked: jest.Mocked<NotificationsServiceContract> = {
    start: jest.fn(),
    stop: jest.fn(),
  };
  mocked.start.mockReturnValue(createStartContractMock());
  return mocked;
};

export const notificationServiceMock = {
  create: createMock,
  createStartContract: createStartContractMock,
};
