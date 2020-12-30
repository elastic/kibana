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

const Path = require('path');
const Fs = require('fs');

const { run, createFailError, CiStatsReporter } = require('@kbn/dev-utils');
const webpack = require('webpack');
const Stats = require('webpack/lib/Stats');
const del = require('del');

const { getWebpackConfig } = require('../webpack.config');

const DIST_DIR = Path.resolve(__dirname, '../target');

run(
  async ({ log, flags }) => {
    log.info('cleaning previous build output');
    await del(DIST_DIR);

    const compiler = webpack(
      getWebpackConfig({
        dev: flags.dev,
      })
    );

    /** @param {webpack.Stats} stats */
    const onCompilationComplete = async (stats) => {
      const took = Math.round((stats.endTime - stats.startTime) / 1000);

      if (!stats.hasErrors() && !stats.hasWarnings()) {
        if (!flags.dev) {
          const reporter = CiStatsReporter.fromEnv(log);

          const metrics = [
            {
              group: '@kbn/ui-shared-deps asset size',
              id: 'kbn-ui-shared-deps.js',
              value: Fs.statSync(Path.resolve(DIST_DIR, 'kbn-ui-shared-deps.js')).size,
            },
            {
              group: '@kbn/ui-shared-deps asset size',
              id: 'kbn-ui-shared-deps.@elastic.js',
              value: Fs.statSync(Path.resolve(DIST_DIR, 'kbn-ui-shared-deps.@elastic.js')).size,
            },
            {
              group: '@kbn/ui-shared-deps asset size',
              id: 'css',
              value:
                Fs.statSync(Path.resolve(DIST_DIR, 'kbn-ui-shared-deps.css')).size +
                Fs.statSync(Path.resolve(DIST_DIR, 'kbn-ui-shared-deps.v7.light.css')).size,
            },
          ];

          log.debug('metrics:', metrics);

          await reporter.metrics(metrics);
        }

        log.success(`webpack completed in about ${took} seconds`);
        return;
      }

      throw createFailError(
        `webpack failure in about ${took} seconds\n${stats.toString({
          colors: true,
          ...Stats.presetToOptions('minimal'),
        })}`
      );
    };

    if (flags.watch) {
      compiler.hooks.done.tap('report on stats', (stats) => {
        onCompilationComplete(stats).catch((error) => {
          log.error(error.message);
        });
      });

      compiler.hooks.watchRun.tap('report on start', () => {
        if (process.stdout.isTTY) {
          process.stdout.cursorTo(0, 0);
          process.stdout.clearScreenDown();
        }

        log.info('Running webpack compilation...');
      });

      compiler.watch({}, (error) => {
        if (error) {
          log.error('Fatal webpack error');
          log.error(error);
          process.exit(1);
        }
      });

      return;
    }

    await onCompilationComplete(
      await new Promise((resolve, reject) => {
        compiler.run((error, stats) => {
          if (error) {
            reject(error);
          } else {
            resolve(stats);
          }
        });
      })
    );
  },
  {
    description: 'build @kbn/ui-shared-deps',
    flags: {
      boolean: ['watch', 'dev'],
      help: `
        --watch            Run in watch mode
        --dev              Build development friendly version
      `,
    },
  }
);
