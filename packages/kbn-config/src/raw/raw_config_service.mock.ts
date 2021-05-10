/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { PublicMethodsOf } from '@kbn/utility-types';
import { RawConfigService } from './raw_config_service';
import { Observable, of } from 'rxjs';

const createRawConfigServiceMock = ({
  rawConfig = {},
  rawConfig$ = undefined,
}: { rawConfig?: Record<string, any>; rawConfig$?: Observable<Record<string, any>> } = {}) => {
  const mocked: jest.Mocked<PublicMethodsOf<RawConfigService>> = {
    loadConfig: jest.fn(),
    stop: jest.fn(),
    reloadConfig: jest.fn(),
    getConfig$: jest.fn().mockReturnValue(rawConfig$ || of(rawConfig)),
  };

  return mocked;
};

export const rawConfigServiceMock = {
  create: createRawConfigServiceMock,
};
