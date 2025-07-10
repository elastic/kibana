/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { IUiSettingsClient } from '@kbn/core-ui-settings-browser';
import { Subject } from 'rxjs';

export const clientMock = () => {
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
    validateValue: jest.fn(),
  };
  mock.get$.mockReturnValue(new Subject<any>());
  mock.getUpdate$.mockReturnValue(new Subject<any>());
  mock.getUpdateErrors$.mockReturnValue(new Subject<any>());
  mock.getAll.mockReturnValue({});
  return mock;
};
