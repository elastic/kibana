/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { v4 as uuid } from 'uuid';
import { defineConfig } from 'cypress';
import wp from '@cypress/webpack-preprocessor';
import { NodeLibsBrowserPlugin } from '@kbn/node-libs-browser-webpack-plugin';
import {
  SCOUT_REPORT_OUTPUT_ROOT,
  SCOUT_REPORTER_ENABLED,
  ScoutTestRunConfigCategory,
} from '@kbn/scout-info';
import { REPO_ROOT } from '@kbn/repo-info';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { camelCase } from 'lodash';

export const SCOUT_CYPRESS_REPORTER_PATH = path.join(
  REPO_ROOT,
  'src/platform/packages/shared/kbn-cypress-config/src/reporting/scout_events'
);

// Cache for work dir and counter to ensure we read reporter config path only once
let counter: number = 0;
let cachedWorkDir: string;

/**
 * Extract the Cypress config file path from process arguments or environment
 */
function getCypressConfigPath(): string {
  // Try to get from process.argv
  const configFileArgIndex = process.argv.findIndex((arg) => arg === '--config-file');
  if (configFileArgIndex !== -1 && process.argv[configFileArgIndex + 1]) {
    return process.argv[configFileArgIndex + 1];
  }

  // Try to get from environment variable (set by start_cypress_parallel script)
  if (process.env.CYPRESS_CONFIG_FILE) {
    return process.env.CYPRESS_CONFIG_FILE;
  }
  return '';
}

function getReportingOptionOverrides(options?: Cypress.ConfigOptions): Record<string, any> {
  if (!SCOUT_REPORTER_ENABLED) {
    // Scout reporter not enabled, no reporting settings to override
    return {};
  }

  const reporter: string | undefined = options?.reporter;
  // if reporter is not defined then config runs locally and logs results to console
  if (reporter === undefined || !reporter.endsWith('cypress-multi-reporters')) {
    return {};
  }

  // this is the list of reporters that should be enabled through the multi-reporter plugin
  let enabledReporters: string[] = [];
  let reporterOptions: Record<string, any> = options?.reporterOptions ?? {};

  if (reporterOptions.configFile) {
    // Load reporter options from file
    // path in the config file is relative to package.json so I should keep the path of first process.cwd.
    // This will ensure path exists for all cases
    if (counter === 0) {
      cachedWorkDir = process.cwd();
      counter++;
    }

    reporterOptions = JSON.parse(
      readFileSync(path.join(cachedWorkDir, reporterOptions.configFile), 'utf8')
    );
  }

  if (reporterOptions.reporterEnabled) {
    enabledReporters = reporterOptions.reporterEnabled.split(',').map((r: string) => r.trim());
  }

  // if (!reporter.endsWith('cypress-multi-reporters')) {
  //   // Given options are not using the multi-reporters plugin
  //   reporterEnabled.push(reporter);
  //   reporter = 'cypress-multi-reporters';
  // }

  if (SCOUT_REPORTER_ENABLED) {
    enabledReporters.push(SCOUT_CYPRESS_REPORTER_PATH);
    const configPath = getCypressConfigPath();
    reporterOptions[`${camelCase(SCOUT_CYPRESS_REPORTER_PATH)}ReporterOptions`] = {
      name: 'cypress',
      outputPath: SCOUT_REPORT_OUTPUT_ROOT,
      config: configPath
        ? {
            path: configPath,
            category: ScoutTestRunConfigCategory.UI_TEST,
          }
        : undefined,
    };
  }

  // Make sure all the correct reporters are enabled
  reporterOptions.reporterEnabled = enabledReporters.join(', ');

  return { reporter, reporterOptions };
}

export function defineCypressConfig(options?: Cypress.ConfigOptions<any>) {
  return defineConfig({
    ...options,
    ...getReportingOptionOverrides(options),
    e2e: {
      ...options?.e2e,
      setupNodeEvents(on, config) {
        on('file:preprocessor', (file) => {
          const id = uuid();
          // Fix an issue with running Cypress parallel
          file.outputPath = file.outputPath.replace(/^(.*\/)(.*?)(\..*)$/, `$1$2.${id}$3`);

          return wp({
            webpackOptions: {
              resolve: {
                extensions: ['.ts', '.tsx', '.js'],
              },
              module: {
                rules: [
                  {
                    test: /\.(js|tsx?)$/,
                    exclude: /node_modules/,
                    use: {
                      loader: 'babel-loader',
                      options: {
                        babelrc: false,
                        envName: 'development',
                        presets: [require.resolve('@kbn/babel-preset/webpack_preset')],
                      },
                    },
                  },
                ],
              },
              plugins: [new NodeLibsBrowserPlugin()],
            },
          })(file);
        });

        const external = options?.e2e?.setupNodeEvents;
        if (external) {
          external((event: any, task: any) => {
            if (event === 'file:preprocessor') {
              throw new Error('file:preprocessor is defined in @kbn/cypress-config');
            }

            on(event, task);
          }, config);

          return config;
        }
      },
    },
  });
}
