/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PublicMethodsOf } from '@kbn/utility-types';
import type { I18nService } from '@kbn/core-i18n-browser-internal';
import type { I18nStart } from '@kbn/core-i18n-browser';
import { I18nProviderMock } from './i18n_context_mock';

const createStartContractMock = () => {
  const setupContract: jest.Mocked<I18nStart> = {
    // Stubbed provider returning the default message or id
    Context: jest.fn().mockImplementation(I18nProviderMock),
  };
  return setupContract;
};

type I18nServiceContract = PublicMethodsOf<I18nService>;
const createMock = () => {
  const mocked: jest.Mocked<I18nServiceContract> = {
    getContext: jest.fn(),
    start: jest.fn(),
    stop: jest.fn(),
  };
  mocked.getContext.mockReturnValue(createStartContractMock());
  mocked.start.mockReturnValue(createStartContractMock());
  return mocked;
};

export const i18nServiceMock = {
  create: createMock,
  createStartContract: createStartContractMock,
};
