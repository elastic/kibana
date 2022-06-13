/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ExposedToBrowserDescriptor } from './types';

export const createBrowserConfig = <T = unknown>(
  config: T,
  descriptor: ExposedToBrowserDescriptor<T>
): unknown => {
  return recursiveCreateConfig(config, descriptor);
};

const recursiveCreateConfig = <T = unknown>(
  config: T,
  descriptor: ExposedToBrowserDescriptor<T> = {}
): unknown => {
  return Object.entries(config || {}).reduce((browserConfig, [key, value]) => {
    const exposedConfig = descriptor[key as keyof ExposedToBrowserDescriptor<T>];
    if (exposedConfig && typeof exposedConfig === 'object') {
      browserConfig[key] = recursiveCreateConfig(value, exposedConfig);
    }
    if (exposedConfig === true) {
      browserConfig[key] = value;
    }
    return browserConfig;
  }, {} as Record<string, unknown>);
};
