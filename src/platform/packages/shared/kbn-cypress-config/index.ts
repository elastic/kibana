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
import fs from 'fs';
import path from 'path';

const SCOUT_REPORTER = '@kbn/scout-cypress-reporter';

export function defineCypressConfig(options?: Cypress.ConfigOptions<any>) {
  // Inject Scout reporter if enabled via environment variable
  if (process.env.SCOUT_REPORTER_ENABLED && options?.reporterOptions) {
    const { configFile } = options.reporterOptions as any;

    if (configFile) {
      let reporterConfig: any;

      // Check if configFile is a string (path) or an object
      if (typeof configFile === 'string') {
        // Load the JSON file - resolve path relative to process.cwd()
        const resolvedPath = path.resolve(process.cwd(), configFile);

        try {
          const configContent = fs.readFileSync(resolvedPath, 'utf-8');
          reporterConfig = JSON.parse(configContent);
        } catch (error) {
          // eslint-disable-next-line no-console
          console.warn(`Warning: Could not read reporter config file at ${resolvedPath}`, error);
        }
      } else if (typeof configFile === 'object') {
        // configFile is already an object
        reporterConfig = configFile;
      }

      // If we have a config and it has reporterEnabled, append our reporter
      if (reporterConfig && reporterConfig.reporterEnabled) {
        const currentReporters = reporterConfig.reporterEnabled;

        // Only append if not already present
        if (!currentReporters.includes(SCOUT_REPORTER)) {
          reporterConfig.reporterEnabled = `${currentReporters}, ${SCOUT_REPORTER}`;
        }

        // Replace configFile with the modified object
        options.reporterOptions.configFile = reporterConfig;
      }
    }
  }

  return defineConfig({
    ...options,
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
