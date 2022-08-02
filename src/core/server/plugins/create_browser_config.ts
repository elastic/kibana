/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ExposedToBrowserDescriptor, PluginConfigDescriptor } from './types';

export const createBrowserConfig = <T = unknown>(
  config: T,
  descriptor: PluginConfigDescriptor<T>
) => {
  if (!descriptor.exposeToBrowser) {
    return { browserConfig: {}, exposedConfigKeys: {} };
  }
  return {
    browserConfig: recursiveCreateConfig(config, descriptor.exposeToBrowser),
    exposedConfigKeys: getExposedConfigKeys(descriptor),
  };
};

const recursiveCreateConfig = <T = unknown>(
  config: T,
  descriptor: ExposedToBrowserDescriptor<T> = {}
) => {
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

/**
 * Given a plugin descriptor, this function returns an object that contains a flattened list of exposed config keys. This is used for a CI
 * check to ensure that consumers don't accidentally expose more config settings to the browser than intended.
 */
function getExposedConfigKeys<T = unknown>(descriptor: PluginConfigDescriptor<T>) {
  const schemaStructure = descriptor.schema.getSchemaStructure();
  const flattenedConfigSchema: Record<string, string> = {};
  for (const { path, type } of schemaStructure) {
    if (checkIsPathExposed(path, descriptor.exposeToBrowser!)) {
      flattenedConfigSchema[path.join('.')] = type;
    }
  }
  return flattenedConfigSchema;
}

function checkIsPathExposed<T = unknown>(
  path: string[],
  descriptor: ExposedToBrowserDescriptor<T>
) {
  let isExposed = false;
  for (const key of path) {
    // Traverse the path to see if it is exposed or not
    const exposedConfig = descriptor[key as keyof ExposedToBrowserDescriptor<T>];
    if (exposedConfig && typeof exposedConfig === 'object') {
      // @ts-expect-error Type 'undefined' is not assignable to type 'ExposedToBrowserDescriptor<T>'
      descriptor = exposedConfig;
      continue;
    }
    if (exposedConfig === true) {
      isExposed = true;
    }
    break;
  }
  return isExposed;
}
