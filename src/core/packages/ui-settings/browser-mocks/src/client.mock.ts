/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IUiSettingsClient } from '@kbn/core-ui-settings-browser';
import { Subject } from 'rxjs';
import { lazyObject } from '@kbn/lazy-object';

export const clientMock = () => {
  const mock: jest.Mocked<IUiSettingsClient> = lazyObject({
    getAll: jest.fn().mockReturnValue({}),
    get: jest.fn(),
    get$: jest.fn().mockReturnValue(new Subject<any>()),
    set: jest.fn(),
    remove: jest.fn(),
    isDeclared: jest.fn(),
    isDefault: jest.fn(),
    isCustom: jest.fn(),
    isOverridden: jest.fn(),
    getUpdate$: jest.fn().mockReturnValue(new Subject<any>()),
    getUpdateErrors$: jest.fn().mockReturnValue(new Subject<any>()),
    validateValue: jest.fn(),
  });

  return mock;
};
