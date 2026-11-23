/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ExposedToBrowserDescriptor, PluginConfigDescriptor } from '@kbn/core-plugins-server';

export const createBrowserConfig = <T = unknown>(
  config: T,
  descriptor: PluginConfigDescriptor<T>
) => {
  if (!descriptor.exposeToBrowser) {
    return { browserConfig: {} };
  }
  return {
    browserConfig: recursiveCreateConfig(config, descriptor.exposeToBrowser),
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
 * check (`exposed_config_keys.test.ts`) to ensure that consumers don't accidentally expose more config settings to the browser than intended.
 * Rendering does not call it, so pages never walk the config schema.
 */
export function getExposedConfigKeys<T = unknown>(
  descriptor: PluginConfigDescriptor<T>
): Record<string, string> {
  const { exposeToBrowser, schema } = descriptor;
  if (!exposeToBrowser) {
    return {};
  }
  const schemaStructure = schema.getSchemaStructure({ expandBranches: true });
  const flattenedConfigSchema: Record<string, string> = {};
  for (const { path, type } of schemaStructure) {
    const exposure = getPathExposure(path, exposeToBrowser);
    if (exposure) {
      const escapedPath = path.map((segment) =>
        segment.replace(/\\/g, '\\\\').replace(/\./g, '\\.')
      );
      flattenedConfigSchema[escapedPath.join('.')] =
        exposure === true ? type : `${type} [selected: ${serializeSelector(exposure)}]`;
    }
  }
  return flattenedConfigSchema;
}

/**
 * A path whose descriptor is still an object when the path ends is a leaf (such as a record) that the descriptor
 * picks keys from. Preserve that selector so changes to an opaque leaf are visible to the CI allow-list.
 * The empty root path of a config schema with no keys holds nothing.
 */
function getPathExposure<T = unknown>(
  path: string[],
  descriptor: ExposedToBrowserDescriptor<T>
): boolean | ExposedToBrowserDescriptor<T> {
  if (!path.length) {
    return false;
  }
  for (const key of path) {
    const exposedConfig = descriptor[key as keyof ExposedToBrowserDescriptor<T>];
    if (exposedConfig && typeof exposedConfig === 'object') {
      descriptor = exposedConfig;
      continue;
    }
    return exposedConfig === true;
  }
  return descriptor;
}

function serializeSelector(selector: object): string {
  return JSON.stringify(selector, (_key, value: unknown) => {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return Object.fromEntries(
        Object.entries(value).sort(([left], [right]) => left.localeCompare(right))
      );
    }
    return value;
  });
}
