/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { BehaviorSubject } from 'rxjs';
import { ObjectToConfigAdapter } from './object_to_config_adapter';

import { IConfigService } from './config_service';

const createConfigServiceMock = ({
  atPath = {},
  getConfig$ = {},
}: { atPath?: Record<string, any>; getConfig$?: Record<string, any> } = {}) => {
  const mocked: jest.Mocked<IConfigService> = {
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
