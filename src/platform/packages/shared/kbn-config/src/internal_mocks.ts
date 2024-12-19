/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Observable, of } from 'rxjs';
import { DocLinks } from '@kbn/doc-links';
import { PublicMethodsOf } from '@kbn/utility-types';
import type { EnvOptions } from './env';
import type { RawConfigService } from './raw';
import type { ConfigDeprecationContext } from './deprecation';

type DeepPartial<T> = {
  [P in keyof T]?: P extends 'repoPackages'
    ? T[P]
    : T[P] extends Array<infer R>
    ? Array<DeepPartial<R>>
    : DeepPartial<T[P]>;
};

export function getEnvOptions(options: DeepPartial<EnvOptions> = {}): EnvOptions {
  return {
    configs: options.configs || [],
    cliArgs: {
      dev: true,
      silent: false,
      watch: false,
      basePath: false,
      disableOptimizer: true,
      cache: true,
      dist: false,
      oss: false,
      runExamples: false,
      ...(options.cliArgs || {}),
    },
    repoPackages: options.repoPackages,
  };
}

export const createMockedContext = (): ConfigDeprecationContext => {
  return {
    branch: 'master',
    version: '8.0.0',
    docLinks: {} as DocLinks,
  };
};

export const createRawConfigServiceMock = ({
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
