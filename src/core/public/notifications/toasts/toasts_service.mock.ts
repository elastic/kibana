/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Observable } from 'rxjs';
import { IToasts } from './toasts_api';

const createToastsApiMock = () => {
  const api: jest.Mocked<IToasts> = {
    get$: jest.fn(() => new Observable()),
    add: jest.fn(),
    remove: jest.fn(),
    addInfo: jest.fn(),
    addSuccess: jest.fn(),
    addWarning: jest.fn(),
    addDanger: jest.fn(),
    addError: jest.fn(),
  };
  return api;
};

const createSetupContractMock = createToastsApiMock;

const createStartContractMock = createToastsApiMock;

export const toastsServiceMock = {
  createSetupContract: createSetupContractMock,
  createStartContract: createStartContractMock,
};
