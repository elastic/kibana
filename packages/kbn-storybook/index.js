/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

const { join } = require('path');
const storybook = require('@storybook/react/standalone');
const { run } = require('@kbn/dev-utils');
const { distDir } = require('@kbn/ui-shared-deps');
const { ASSET_DIR } = require('./lib/constants');

exports.defaultConfig = {
  addons: ['@kbn/storybook/preset', '@storybook/addon-knobs', '@storybook/addon-essentials'],
  stories: ['../**/*.stories.tsx'],
  typescript: {
    reactDocgen: 'none',
  },
};

exports.runStorybookCli = ({ configDir, name }) => {
  run(
    async ({ flags, log }) => {
      log.debug('Global config:\n', require('./lib/constants'));

      const staticDir = [distDir];
      const config = {
        mode: flags.site ? 'static' : 'dev',
        port: 9001,
        configDir,
        staticDir,
      };
      if (flags.site) {
        config.outputDir = join(ASSET_DIR, name);
      }

      await storybook(config);

      // Line is only reached when building the static version
      if (flags.site) process.exit();
    },
    {
      flags: {
        boolean: ['site'],
      },
      description: `
        Run the storybook examples for ${name}
      `,
    }
  );
};
