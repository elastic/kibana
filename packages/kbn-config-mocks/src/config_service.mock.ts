/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject } from 'rxjs';
import { ObjectToConfigAdapter, IConfigService } from '@kbn/config';

export type IConfigServiceMock = jest.Mocked<IConfigService>;

const createConfigServiceMock = ({
  atPath = {},
  getConfig$ = {},
}: { atPath?: Record<string, any>; getConfig$?: Record<string, any> } = {}) => {
  const mocked: IConfigServiceMock = {
    atPath: jest.fn(),
    atPathSync: jest.fn(),
    getConfig$: jest.fn(),
    getUsedPaths: jest.fn(),
    getUnusedPaths: jest.fn(),
    isEnabledAtPath: jest.fn(),
    setSchema: jest.fn(),
    addDeprecationProvider: jest.fn(),
    validate: jest.fn(),
    getHandledDeprecatedConfigs: jest.fn(),
    getDeprecatedConfigPath$: jest.fn(),
    addDynamicConfigPaths: jest.fn(),
    setDynamicConfigOverrides: jest.fn(),
    setGlobalStripUnknownKeys: jest.fn(),
  };

  mocked.atPath.mockReturnValue(new BehaviorSubject(atPath));
  mocked.atPathSync.mockReturnValue(atPath);
  mocked.getConfig$.mockReturnValue(new BehaviorSubject(new ObjectToConfigAdapter(getConfig$)));
  mocked.getDeprecatedConfigPath$.mockReturnValue(new BehaviorSubject({ set: [], unset: [] }));
  mocked.getUsedPaths.mockResolvedValue([]);
  mocked.getUnusedPaths.mockResolvedValue([]);
  mocked.isEnabledAtPath.mockResolvedValue(true);
  mocked.getHandledDeprecatedConfigs.mockReturnValue([]);

  return mocked;
};

export const configServiceMock = {
  create: createConfigServiceMock,
};
