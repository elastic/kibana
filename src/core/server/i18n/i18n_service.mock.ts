/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
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
