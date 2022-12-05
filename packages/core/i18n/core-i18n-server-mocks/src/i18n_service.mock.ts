/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { PublicMethodsOf } from '@kbn/utility-types';
import type { ScopedTranslator } from '@kbn/core-i18n-common';
import type { I18nServiceSetup, I18nServiceStart } from '@kbn/core-i18n-server';
import type { I18nService } from '@kbn/core-i18n-server-internal';

type I18nServiceContract = PublicMethodsOf<I18nService>;

const createTranslatorMock = () => {
  const mock: jest.Mocked<ScopedTranslator> = {
    locale: 'en',
    translate: jest.fn(),
  };

  mock.translate.mockImplementation((message: string) => message);

  return mock;
};

const createSetupContractMock = () => {
  const mock: jest.Mocked<I18nServiceSetup> = {
    getLocale: jest.fn(),
    getDefaultLocale: jest.fn(),
    getTranslationFiles: jest.fn(),
    getScopedTranslator: jest.fn(),
  };

  mock.getLocale.mockReturnValue('en');
  mock.getDefaultLocale.mockReturnValue('en');
  mock.getTranslationFiles.mockReturnValue([]);
  mock.getScopedTranslator.mockImplementation(() => createTranslatorMock());

  return mock;
};

const createStartContractMock = () => {
  const mock: jest.Mocked<I18nServiceStart> = {
    getLocaleForRequest: jest.fn(),
    getScopedTranslator: jest.fn(),
  };

  mock.getLocaleForRequest.mockReturnValue('en');
  mock.getScopedTranslator.mockImplementation(() => createTranslatorMock());

  return mock;
};

const createMock = () => {
  const mock: jest.Mocked<I18nServiceContract> = {
    preboot: jest.fn(),
    setup: jest.fn(),
    start: jest.fn(),
  };

  mock.setup.mockResolvedValue(createSetupContractMock());
  mock.start.mockResolvedValue(createStartContractMock());

  return mock;
};

export const i18nServiceMock = {
  create: createMock,
  createSetupContract: createSetupContractMock,
  createStartContract: createStartContractMock,
  createTranslator: createTranslatorMock,
};
