/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { KibanaPlatformPlugin, REPO_ROOT } from '@kbn/dev-utils';
import Path from 'path';

export function getKibanaPlatformPlugin(
  id: string,
  relativeDirectory: string
): KibanaPlatformPlugin {
  return {
    manifest: {
      id,
      ui: true,
      server: true,
      kibanaVersion: '1',
      version: '1',
      serviceFolders: [],
      requiredPlugins: [],
      requiredBundles: [],
      optionalPlugins: [],
      extraPublicDirs: [],
    },
    relativeDirectory,
    directory: Path.resolve(REPO_ROOT, relativeDirectory),
    manifestPath: Path.resolve(REPO_ROOT, relativeDirectory, 'kibana.json'),
  };
}
