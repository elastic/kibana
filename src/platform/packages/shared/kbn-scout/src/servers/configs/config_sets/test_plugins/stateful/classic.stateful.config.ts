/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { resolve } from 'path';
import { REPO_ROOT } from '@kbn/repo-info';
import { findTestPluginPaths } from '@kbn/test-kibana-server';
import type { ScoutServerConfig } from '../../../../../types';
import { defaultConfig } from '../../default/stateful/base.config';

/**
 * Scout server config for tests that rely on the plugin_functional test plugins, on local stateful classic.
 *
 * Usage:
 *   node scripts/scout.js start-server --arch stateful --domain classic --serverConfigSet test_plugins
 */
export const servers: ScoutServerConfig = {
  ...defaultConfig,
  kbnTestServer: {
    ...defaultConfig.kbnTestServer,
    serverArgs: [
      ...defaultConfig.kbnTestServer.serverArgs,
      // Required to load new platform plugins via `--plugin-path` flag.
      '--env.name=development',
      '--corePluginDeprecations.oldProperty=hello',
      '--corePluginDeprecations.secret=100',
      '--corePluginDeprecations.noLongerUsed=still_using',
      // for testing set buffer duration to 0 to immediately flush counters into saved objects.
      '--usageCollection.usageCounters.bufferDuration=0',
      // We want to test when the banner is shown
      '--telemetry.banner=true',
      // explicitly enable the cloud integration plugins to validate the rendered config keys
      '--xpack.cloud_integrations.experiments.enabled=true',
      '--xpack.cloud_integrations.experiments.launch_darkly.sdk_key=a_string',
      '--xpack.cloud_integrations.experiments.launch_darkly.client_id=a_string',
      '--xpack.cloud_integrations.full_story.enabled=true',
      '--xpack.cloud_integrations.full_story.org_id=a_string',
      ...findTestPluginPaths(resolve(REPO_ROOT, 'src/platform/test/plugin_functional/plugins')),
    ],
  },
};
