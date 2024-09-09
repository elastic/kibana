/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PublicMethodsOf } from '@kbn/utility-types';
import type { I18nService, InternalI18nServicePreboot } from '@kbn/core-i18n-server-internal';
import type { I18nServiceSetup } from '@kbn/core-i18n-server';

const createSetupContractMock = () => {
  const mock: jest.Mocked<I18nServiceSetup> = {
    getLocale: jest.fn(),
    getTranslationFiles: jest.fn(),
    getTranslationHash: jest.fn(),
  };

  mock.getLocale.mockReturnValue('en');
  mock.getTranslationFiles.mockReturnValue([]);
  mock.getTranslationHash.mockReturnValue('MOCK_HASH');

  return mock;
};

const createInternalPrebootMock = () => {
  const mock: jest.Mocked<InternalI18nServicePreboot> = {
    getTranslationHash: jest.fn(),
  };

  mock.getTranslationHash.mockReturnValue('MOCK_HASH');

  return mock;
};

type I18nServiceContract = PublicMethodsOf<I18nService>;

const createMock = () => {
  const mock: jest.Mocked<I18nServiceContract> = {
    preboot: jest.fn(),
    setup: jest.fn(),
  };

  mock.setup.mockResolvedValue(createSetupContractMock());

  return mock;
};

export const i18nServiceMock = {
  create: createMock,
  createSetupContract: createSetupContractMock,
  createInternalPrebootContract: createInternalPrebootMock,
};
