/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { simpleKibanaPlatformPluginDiscovery } from '@kbn/plugin-discovery';

export interface KibanaPlatformPlugin {
  readonly directory: string;
  readonly manifestPath: string;
  readonly id: string;
  readonly isUiPlugin: boolean;
  readonly extraPublicDirs: string[];
}

const isArrayOfStrings = (input: any): input is string[] =>
  Array.isArray(input) && input.every((p) => typeof p === 'string');

/**
 * Helper to find the new platform plugins.
 */
export function findKibanaPlatformPlugins(scanDirs: string[], paths: string[]) {
  return simpleKibanaPlatformPluginDiscovery(scanDirs, paths).map(
    ({ directory, manifestPath, manifest }): KibanaPlatformPlugin => {
      let extraPublicDirs: string[] | undefined;
      if (manifest.extraPublicDirs) {
        if (!isArrayOfStrings(manifest.extraPublicDirs)) {
          throw new TypeError(
            'expected new platform plugin manifest to have an array of strings `extraPublicDirs` property'
          );
        }
        extraPublicDirs = manifest.extraPublicDirs;
      }

      return {
        directory,
        manifestPath,
        id: manifest.id,
        isUiPlugin: manifest.ui,
        extraPublicDirs: extraPublicDirs || [],
      };
    }
  );
}
