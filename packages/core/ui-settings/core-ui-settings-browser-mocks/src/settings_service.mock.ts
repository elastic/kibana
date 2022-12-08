/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as Rx from 'rxjs';
import type { PublicMethodsOf } from '@kbn/utility-types';
import type { SettingsService } from '@kbn/core-ui-settings-browser-internal';
import type { IUiSettingsClient } from '@kbn/core-ui-settings-browser';

const createSetupContractMock = () => {
  const clientMock = () => {
    const mock: jest.Mocked<IUiSettingsClient> = {
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
    mock.get$.mockReturnValue(new Rx.Subject<any>());
    mock.getUpdate$.mockReturnValue(new Rx.Subject<any>());
    mock.getUpdateErrors$.mockReturnValue(new Rx.Subject<any>());
    mock.getAll.mockReturnValue({});
    return mock;
  };
  const client = clientMock();
  const globalClient = clientMock();

  return {
    client,
    globalClient,
  };
};

type SettingsServiceContract = PublicMethodsOf<SettingsService>;
const createMock = () => {
  const mocked: jest.Mocked<SettingsServiceContract> = {
    setup: jest.fn(),
    start: jest.fn(),
    stop: jest.fn(),
  };

  mocked.setup.mockReturnValue(createSetupContractMock());
  return mocked;
};

export const settingsServiceMock = {
  create: createMock,
  createSetupContract: createSetupContractMock,
  createStartContract: createSetupContractMock,
};
