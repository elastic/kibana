/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { KibanaPlatformPlugin } from '@kbn/dev-utils';
import Path from 'path';

export function getKibanaPlatformPlugin(id: string, dir?: string): KibanaPlatformPlugin {
  const directory = dir ?? Path.resolve(__dirname, '__fixtures__/src/plugin_a');
  return {
    manifest: {
      id,
      ui: true,
      server: true,
      kibanaVersion: '1',
      version: '1',
      owner: {
        name: 'Kibana Core',
      },
      serviceFolders: [],
      requiredPlugins: [],
      requiredBundles: [],
      optionalPlugins: [],
      extraPublicDirs: [],
    },
    directory,
    manifestPath: Path.resolve(directory, 'kibana.json'),
  };
}
