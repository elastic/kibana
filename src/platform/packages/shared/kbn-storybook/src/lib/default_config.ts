/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as path from 'path';
import fs from 'fs';
import type { StorybookConfig } from '@storybook/react-webpack5';
import type { Configuration, Compiler } from 'webpack';
import UiSharedDepsNpm from '@kbn/ui-shared-deps-npm';
import * as UiSharedDepsSrc from '@kbn/ui-shared-deps-src';
import { default as webpackConfig } from '../webpack.config';

const MOCKS_DIRECTORY = '__storybook_mocks__';
const EXTENSIONS = ['.ts', '.js'];

export type { StorybookConfig };

// This ignore pattern excludes all of node_modules EXCEPT for `@kbn`.  This allows for
// changes to packages to cause a refresh in Storybook.
const IGNORE_GLOBS = [
  '**/node_modules/**',
  '!**/node_modules/@kbn/**',
  '!**/node_modules/@kbn/*/**',
  '!**/node_modules/@kbn/*/!(node_modules)/**',
];

export const defaultConfig: StorybookConfig = {
  addons: [
    '@storybook/addon-webpack5-compiler-babel',
    '@kbn/storybook/preset',
    '@storybook/addon-a11y',
    '@storybook/addon-essentials',
  ],
  framework: {
    name: '@storybook/react-webpack5',
    options: {
      fastRefresh: true,
      builder: {
        fsCache: true,
      },
    },
  },
  core: {
    disableTelemetry: true,
    enableCrashReports: false,
  },
  previewAnnotations: [path.resolve(__dirname, './preview.ts')],
  previewHead: (head) => `
  ${head}
      <script>
        window.__kbnPublicPath__ = { 'kbn-ui-shared-deps-npm': '', 'kbn-ui-shared-deps-src': '' };
        window.__kbnHardenPrototypes__ = false;
      </script>
      <meta name="eui-global" />
      <meta name="emotion" />
      <script src="kbn-ui-shared-deps-npm.dll.js"></script>
      <script src="kbn-ui-shared-deps-src.js"></script>
      <link href="kbn-ui-shared-deps-npm.css" rel="stylesheet" />
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link
        href="https://fonts.googleapis.com/css2?family=Inter:wght@300..700&family=Roboto+Mono:ital,wght@0,400..700;1,400..700&display=swap"
        rel="stylesheet">
      <meta name="eui-utilities" />
  `,
  stories: ['../**/*.stories.tsx', '../**/*.mdx'],
  typescript: {
    reactDocgen: false,
    check: false,
  },
  staticDirs: [
    UiSharedDepsNpm.distDir,
    UiSharedDepsSrc.distDir,
    {
      from: path.resolve(__dirname, '../../../../../plugins/shared/kibana_react/public/assets'),
      to: 'plugins/kibanaReact/assets',
    },
  ],

  babel: async (options: Record<string, any>) => {
    options.presets = options.presets || [];
    options.presets.push([
      require.resolve('@emotion/babel-preset-css-prop'),
      {
        // There's an issue where emotion classnames may be duplicated,
        // (e.g. `[hash]-[filename]--[local]_[filename]--[local]`)
        // https://github.com/emotion-js/emotion/issues/2417
        autoLabel: 'always',
        labelFormat: '[filename]--[local]',
      },
    ]);
    return options;
  },
  webpackFinal: async (config: Configuration) => {
    if (process.env.CI) {
      config.parallelism = 4;
      config.cache = true;
    }

    // Create a custom mock replacement plugin
    const createMockPlugin = (pattern: RegExp) => {
      return {
        apply(compiler: Compiler) {
          compiler.hooks.normalModuleFactory.tap('MockReplacementPlugin', (factory) => {
            factory.hooks.beforeResolve.tap('MockReplacementPlugin', (resolveData: any) => {
              if (!resolveData) return;

              const { request, context, contextInfo } = resolveData;

              // Skip node_modules
              if (contextInfo.issuer?.includes('node_modules')) return;

              // Only process requests matching our pattern
              if (pattern.test(request)) {
                if (request.startsWith('./')) {
                  // Handle ./ imports
                  const mockedPath = path.resolve(context, MOCKS_DIRECTORY, request.slice(2));

                  for (const ext of EXTENSIONS) {
                    if (fs.existsSync(mockedPath + ext)) {
                      resolveData.request = './' + path.join(MOCKS_DIRECTORY, request.slice(2));
                      break;
                    }
                  }
                } else if (request.startsWith('../')) {
                  // Handle ../ imports
                  const prs = path.parse(request);
                  const mockedPath = path.resolve(context, prs.dir, MOCKS_DIRECTORY, prs.base);

                  for (const ext of EXTENSIONS) {
                    if (fs.existsSync(mockedPath + ext)) {
                      resolveData.request = prs.dir + '/' + path.join(MOCKS_DIRECTORY, prs.base);
                      break;
                    }
                  }
                }
              }

              // Don't return anything (or return undefined) to continue with the module
              // Return false only if you want to prevent the module from being created
            });
          });
        },
      };
    };

    // Add custom plugins for ./ and ../ imports
    config.plugins = config.plugins || [];
    config.plugins.push(createMockPlugin(/^\.\//)); // For ./ imports
    config.plugins.push(createMockPlugin(/^\.\.\//)); // For ../ imports

    config.watchOptions = {
      ...config.watchOptions,
      ignored: IGNORE_GLOBS,
    };

    return webpackConfig({ config });
  },
};
