/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject } from 'rxjs';
import type { IConfigService } from '@kbn/config';
import { ObjectToConfigAdapter } from '@kbn/config';
import { lazyObject } from '@kbn/lazy-object';

export type IConfigServiceMock = jest.Mocked<IConfigService>;

const createConfigServiceMock = ({
  atPath = {},
  getConfig$ = {},
}: { atPath?: Record<string, any>; getConfig$?: Record<string, any> } = {}) => {
  const mocked: IConfigServiceMock = lazyObject({
    atPath: jest.fn().mockReturnValue(new BehaviorSubject(atPath)),
    atPathSync: jest.fn().mockReturnValue(atPath),
    getConfig$: jest
      .fn()
      .mockReturnValue(new BehaviorSubject(new ObjectToConfigAdapter(getConfig$))),
    getUsedPaths: jest.fn().mockResolvedValue([]),
    getUnusedPaths: jest.fn().mockResolvedValue([]),
    isEnabledAtPath: jest.fn().mockResolvedValue(true),
    setSchema: jest.fn(),
    addDeprecationProvider: jest.fn(),
    validate: jest.fn(),
    getHandledDeprecatedConfigs: jest.fn().mockReturnValue([]),
    getDeprecatedConfigPath$: jest
      .fn()
      .mockReturnValue(new BehaviorSubject({ set: [], unset: [] })),
    addDynamicConfigPaths: jest.fn(),
    setDynamicConfigOverrides: jest.fn(),
    setGlobalStripUnknownKeys: jest.fn(),
  });

  return mocked;
};

export const configServiceMock = {
  create: createConfigServiceMock,
};
