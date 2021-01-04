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

import { PublicMethodsOf } from '@kbn/utility-types';
import type { I18nServiceSetup, I18nService } from './i18n_service';

const createSetupContractMock = () => {
  const mock: jest.Mocked<I18nServiceSetup> = {
    getLocale: jest.fn(),
    getTranslationFiles: jest.fn(),
  };

  mock.getLocale.mockReturnValue('en');
  mock.getTranslationFiles.mockReturnValue([]);

  return mock;
};

type I18nServiceContract = PublicMethodsOf<I18nService>;

const createMock = () => {
  const mock: jest.Mocked<I18nServiceContract> = {
    setup: jest.fn(),
  };

  mock.setup.mockResolvedValue(createSetupContractMock());

  return mock;
};

export const i18nServiceMock = {
  create: createMock,
  createSetupContract: createSetupContractMock,
};
