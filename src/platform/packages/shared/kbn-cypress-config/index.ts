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

/**
 * Extract the Cypress spec file path from process arguments or environment
 */
function getSpecFilePath(): string {
  // Try to get from process.argv (when running via Cypress CLI)
  const specArgIndex = process.argv.findIndex((arg) => arg === '--spec');
  if (specArgIndex !== -1 && process.argv[specArgIndex + 1]) {
    return process.argv[specArgIndex + 1];
  }

  return '';
}

/**
 * Detect if a spec file is a UI test or API test based on file path and naming patterns
 */
function detectTestCategory(specPath: string): ScoutTestRunConfigCategory {
  if (!specPath) {
    return ScoutTestRunConfigCategory.UI_TEST; // Default to UI test
  }

  // Normalize path for consistent checking
  const normalizedPath = specPath.toLowerCase();

  // API test indicators
  const apiPatterns = ['/api/', '/api_integration/', 'api.cy.', 'api_', '/apis/'];

  // Check if path matches API patterns
  const isApiTest = apiPatterns.some((pattern) => normalizedPath.includes(pattern));

  return isApiTest ? ScoutTestRunConfigCategory.API_TEST : ScoutTestRunConfigCategory.UI_TEST;
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
      // Count number of slashes to determine directory depth
      const slashCount = (reporterOptions.configFile.match(/\//g) || []).length - 1;
      // Move up directories based on slash count to find the config file
      const searchDir = path.join(process.cwd(), '../'.repeat(slashCount));
      reporterOptions = JSON.parse(
        readFileSync(path.join(searchDir, reporterOptions.configFile), 'utf8')
      );
    }
  }

  if (reporterOptions.reporterEnabled) {
    enabledReporters = reporterOptions.reporterEnabled.split(',').map((r: string) => r.trim());
  }

  if (SCOUT_REPORTER_ENABLED) {
    enabledReporters.push(SCOUT_CYPRESS_REPORTER_PATH);
    const specPath = getSpecFilePath();
    reporterOptions[`${camelCase(SCOUT_CYPRESS_REPORTER_PATH)}ReporterOptions`] = {
      name: 'cypress',
      outputPath: SCOUT_REPORT_OUTPUT_ROOT,
      // Config will be determined at runtime from test.file
      // Pass spec path only if available at config time for logging purposes
      config: specPath
        ? {
            path: specPath,
            category: detectTestCategory(specPath),
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
