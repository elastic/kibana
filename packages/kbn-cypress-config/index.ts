/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { defineConfig } from 'cypress';
import wp from '@cypress/webpack-preprocessor';

export function defineCypressConfig(options?: Cypress.ConfigOptions<any>) {
  return defineConfig({
    ...options,
    e2e: {
      ...options?.e2e,
      setupNodeEvents(on, config) {
        on(
          'file:preprocessor',
          wp({
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
            },
          })
        );

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
