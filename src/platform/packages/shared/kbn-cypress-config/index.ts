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
import fs from 'fs';

export const SCOUT_CYPRESS_REPORTER_PATH = path.join(
  REPO_ROOT,
  'src/platform/packages/shared/kbn-cypress-config/src/reporting/scout_events'
);

function getProjectRoot(): string {
  const projectRootIndex = process.argv.findIndex((arg) => arg === '--projectRoot');
  if (projectRootIndex !== -1) {
    return process.argv[projectRootIndex + 1];
  }
  return '';
}

function getCategoryFromPath(configPath: string): ScoutTestRunConfigCategory {
  // Check for API integration tests
  if (configPath.includes('api_integration') || configPath.includes('/api/')) {
    return ScoutTestRunConfigCategory.API_TEST;
  }

  // Check for unit tests
  if (
    configPath.includes('unit') ||
    configPath.includes('.test.') ||
    configPath.includes('.spec.')
  ) {
    return ScoutTestRunConfigCategory.UNIT_TEST;
  }

  // Default to UI_TEST for Cypress
  return ScoutTestRunConfigCategory.UI_TEST;
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
    // Check if config file exists in current directory
    if (fs.existsSync(path.join(process.cwd(), reporterOptions.configFile))) {
      reporterOptions = JSON.parse(
        readFileSync(path.join(process.cwd(), reporterOptions.configFile), 'utf8')
      );
    } else {
      // Else get the project root and read the config file from there
      reporterOptions = JSON.parse(
        readFileSync(path.join(getProjectRoot(), reporterOptions.configFile), 'utf8')
      );
    }
  }

  if (reporterOptions.reporterEnabled) {
    enabledReporters = reporterOptions.reporterEnabled.split(',').map((r: string) => r.trim());
  }

  if (SCOUT_REPORTER_ENABLED) {
    enabledReporters.push(SCOUT_CYPRESS_REPORTER_PATH);

    reporterOptions[`${camelCase(SCOUT_CYPRESS_REPORTER_PATH)}ReporterOptions`] = {
      name: 'cypress',
      outputPath: SCOUT_REPORT_OUTPUT_ROOT,
      config: {
        // The config properties will be set later in setupNodeEvents where config.configFile is available.
      },
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
        // Update Scout reporter options with actual config file path
        // This runs once per config file, so each config gets its own correct path
        if (SCOUT_REPORTER_ENABLED && config.configFile) {
          const reporterOptionsKey = `${camelCase(SCOUT_CYPRESS_REPORTER_PATH)}ReporterOptions`;

          // Update the reporter options in the config object
          // This ensures each config file gets the correct path
          if (config.reporterOptions && config.reporterOptions[reporterOptionsKey]) {
            config.reporterOptions[reporterOptionsKey].config.path = config.configFile;
            config.reporterOptions[reporterOptionsKey].config.category = getCategoryFromPath(
              config.configFile
            );
          }
        }

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

        // Return the modified config so Cypress uses the updated reporter options
        return config;
      },
    },
  });
}
