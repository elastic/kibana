/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';

import { REPO_ROOT } from '@kbn/utils';
import { parseKibanaPlatformPlugin, KibanaPlatformPlugin } from '@kbn/plugin-discovery';
import { createFailError } from '@kbn/dev-utils';

export type Plugin = KibanaPlatformPlugin;

export function loadKibanaPlatformPlugin(pluginDir: string) {
  const parentDir = Path.resolve(pluginDir, '..');

  const isFixture = pluginDir.includes('__fixtures__');
  const isExample = Path.basename(parentDir) === 'examples';
  const isRootPlugin = parentDir === Path.resolve(REPO_ROOT, 'plugins');

  if (isFixture || isExample || isRootPlugin) {
    return parseKibanaPlatformPlugin(Path.resolve(pluginDir, 'kibana.json'));
  }

  throw createFailError(
    `Plugin located at [${pluginDir}] must be moved to the plugins directory at the root of the Kibana repo`
  );
}
