/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import type { PublicMethodsOf } from '@kbn/utility-types';

import { I18nService, I18nStart } from './i18n_service';

const PassThroughComponent = ({ children }: { children: React.ReactNode }) => children;

const createStartContractMock = () => {
  const setupContract: jest.Mocked<I18nStart> = {
    // By default mock the Context component so it simply renders all children
    Context: jest.fn().mockImplementation(PassThroughComponent),
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
