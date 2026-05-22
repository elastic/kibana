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
import { lazyObject } from '@kbn/lazy-object';

const MOCK_TRANSLATION_HASHES: Record<string, string> = { en: 'MOCK_HASH' };
const MOCK_LOCALES: readonly string[] = ['en'];
const MOCK_AVAILABLE_LOCALES: ReadonlyArray<{ id: string; label: string }> = [
  { id: 'en', label: 'English' },
];

const createSetupContractMock = () => {
  const mock: jest.Mocked<I18nServiceSetup> = lazyObject({
    getLocale: jest.fn().mockReturnValue('en'),
    getLocales: jest.fn().mockReturnValue(MOCK_LOCALES),
    getAvailableLocales: jest.fn().mockReturnValue(MOCK_AVAILABLE_LOCALES),
    getTranslationFiles: jest.fn().mockReturnValue([]),
    getTranslationHash: jest.fn().mockReturnValue('MOCK_HASH'),
    getTranslationHashes: jest.fn().mockReturnValue(MOCK_TRANSLATION_HASHES),
  });

  return mock;
};

const createInternalPrebootMock = () => {
  const mock: jest.Mocked<InternalI18nServicePreboot> = lazyObject({
    getTranslationHash: jest.fn(),
    getTranslationHashes: jest.fn(),
    getAvailableLocales: jest.fn(),
  });

  mock.getTranslationHash.mockReturnValue('MOCK_HASH');
  mock.getTranslationHashes.mockReturnValue(MOCK_TRANSLATION_HASHES);
  mock.getAvailableLocales.mockReturnValue(MOCK_AVAILABLE_LOCALES);

  return mock;
};

type I18nServiceContract = PublicMethodsOf<I18nService>;

const createMock = () => {
  const mock: jest.Mocked<I18nServiceContract> = lazyObject({
    preboot: jest.fn(),
    setup: jest.fn().mockResolvedValue(createSetupContractMock()),
  });

  return mock;
};

export const i18nServiceMock = {
  create: createMock,
  createSetupContract: createSetupContractMock,
  createInternalPrebootContract: createInternalPrebootMock,
};
