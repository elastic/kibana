/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as Rx from 'rxjs';
import type { PublicMethodsOf } from '@kbn/utility-types';
import { UiSettingsService } from '.';
import { IUiSettingsClient } from './types';

const createSetupContractMock = () => {
  const setupContract: jest.Mocked<IUiSettingsClient> = {
    getAll: jest.fn(),
    get: jest.fn(),
    get$: jest.fn(),
    set: jest.fn(),
    remove: jest.fn(),
    isDeclared: jest.fn(),
    isDefault: jest.fn(),
    isCustom: jest.fn(),
    isOverridden: jest.fn(),
    getUpdate$: jest.fn(),
    getUpdateErrors$: jest.fn(),
  };
  setupContract.get$.mockReturnValue(new Rx.Subject<any>());
  setupContract.getUpdate$.mockReturnValue(new Rx.Subject<any>());
  setupContract.getUpdateErrors$.mockReturnValue(new Rx.Subject<any>());
  setupContract.getAll.mockReturnValue({});

  return setupContract;
};

type UiSettingsServiceContract = PublicMethodsOf<UiSettingsService>;
const createMock = () => {
  const mocked: jest.Mocked<UiSettingsServiceContract> = {
    setup: jest.fn(),
    start: jest.fn(),
    stop: jest.fn(),
  };

  mocked.setup.mockReturnValue(createSetupContractMock());
  return mocked;
};

export const uiSettingsServiceMock = {
  create: createMock,
  createSetupContract: createSetupContractMock,
  createStartContract: createSetupContractMock,
};
