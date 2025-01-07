/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';
import Fs from 'fs';
import { REPO_ROOT } from '@kbn/repo-info';

import { run } from '@kbn/dev-cli-runner';
import { discoverPlugins } from './discover_plugins';
import { generatePluginList } from './generate_plugin_list';

const OUTPUT_PATH = Path.resolve(REPO_ROOT, 'docs/developer/plugin-list.asciidoc');

export function runPluginListCli() {
  run(async ({ log }) => {
    log.info('looking for oss plugins');
    const ossLegacyPlugins = discoverPlugins('src/plugins');
    const ossPlatformPlugins = discoverPlugins('src/platform/plugins');
    log.success(`found ${ossLegacyPlugins.length + ossPlatformPlugins.length} plugins`);

    log.info('looking for x-pack plugins');
    const xpackLegacyPlugins = discoverPlugins('x-pack/plugins');
    const xpackPlatformPlugins = discoverPlugins('x-pack/platform/plugins');
    const xpackSearchPlugins = discoverPlugins('x-pack/solutions/search/plugins');
    const xpackSecurityPlugins = discoverPlugins('x-pack/solutions/security/plugins');
    const xpackObservabilityPlugins = discoverPlugins('x-pack/solutions/observability/plugins');
    log.success(
      `found ${
        xpackLegacyPlugins.length +
        xpackPlatformPlugins.length +
        xpackSearchPlugins.length +
        xpackSecurityPlugins.length +
        xpackObservabilityPlugins.length
      } plugins`
    );

    log.info('writing plugin list to', OUTPUT_PATH);
    Fs.writeFileSync(
      OUTPUT_PATH,
      generatePluginList(
        [...ossLegacyPlugins, ...ossPlatformPlugins],
        [
          ...xpackLegacyPlugins,
          ...xpackPlatformPlugins,
          ...xpackSearchPlugins,
          ...xpackSecurityPlugins,
          ...xpackObservabilityPlugins,
        ]
      )
    );
  });
}
