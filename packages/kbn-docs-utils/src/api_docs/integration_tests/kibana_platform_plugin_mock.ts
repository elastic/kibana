/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';
import { PluginOrPackage } from '../types';

export function getKibanaPlatformPlugin(id: string, dir?: string): PluginOrPackage {
  const directory = dir ?? Path.resolve(__dirname, '__fixtures__/src/plugin_a');
  return {
    manifest: {
      id,
      owner: {
        name: 'Kibana Core',
      },
      serviceFolders: [],
    },
    directory,
    manifestPath: Path.resolve(directory, 'kibana.json'),
    isPlugin: true,
  };
}

export function getKibanaPlatformPackage(id: string, importPath?: string): PluginOrPackage {
  const directory = Path.resolve(__dirname, '__fixtures__/src/plugin_a');
  return {
    manifest: {
      id,
      owner: {
        name: 'Kibana Core',
      },
      serviceFolders: [],
    },
    directory,
    manifestPath: Path.resolve(directory, 'kibana.json'),
    isPlugin: false,
  };
}
