/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createRequire } from 'module';
import * as path from 'path';
import fs from 'fs';
import { resolve } from 'path';
import { mergeRsbuildConfig, rspack } from '@rsbuild/core';
import type { Rspack } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';
import { pluginSass } from '@rsbuild/plugin-sass';
import type { StorybookConfig } from 'storybook-react-rsbuild';
import { externals } from '@kbn/ui-shared-deps-src';
import UiSharedDepsNpm from '@kbn/ui-shared-deps-npm';
import * as UiSharedDepsSrc from '@kbn/ui-shared-deps-src';
import { NodeLibsBrowserPlugin } from '@kbn/node-libs-browser-webpack-plugin';
import { IgnoreNotFoundExportPlugin } from '../ignore_not_found_export_plugin';
import { REPO_ROOT } from './constants';

const MOCKS_DIRECTORY = '__storybook_mocks__';
const EXTENSIONS = ['.ts', '.js', '.tsx'];
const globalStylesPath = JSON.stringify(
  resolve(REPO_ROOT, 'src/core/public/styles/core_app/_globals_borealislight.scss')
);
const resolveModule = createRequire(__filename).resolve;
const emotionSwcPlugin = resolveModule('@swc/plugin-emotion');

export type { StorybookConfig };

/** Finds the nearest TypeScript project for Storybook React docgen. */
export const createReactDocgenTypescriptOptions = (configDir: string) => {
  let directory = resolve(configDir);

  while (directory !== path.dirname(directory)) {
    const tsconfigPath = path.join(directory, 'tsconfig.json');
    if (fs.existsSync(tsconfigPath)) {
      return { reactDocgenTypescriptOptions: { tsconfigPath } };
    }
    directory = path.dirname(directory);
  }

  throw new Error(`No tsconfig.json found above Storybook config [${configDir}].`);
};

const createMockReplacementPlugin = (request: RegExp) =>
  new rspack.NormalModuleReplacementPlugin(request, (resource: any) => {
    if (resource.contextInfo.issuer?.includes('node_modules')) {
      return;
    }

    const parsedRequest = path.parse(resource.request);
    const mockedPath = path.resolve(
      resource.context,
      parsedRequest.dir,
      MOCKS_DIRECTORY,
      parsedRequest.base
    );

    for (const extension of EXTENSIONS) {
      if (fs.existsSync(mockedPath + extension)) {
        resource.request = `${parsedRequest.dir ? `${parsedRequest.dir}/` : './'}${path.join(
          MOCKS_DIRECTORY,
          parsedRequest.base
        )}`;
        return;
      }
    }
  });

const createRsbuildRspackConfig = (config: Rspack.Configuration): Rspack.Configuration => ({
  ...config,
  externals,
  module: {
    ...config.module,
    rules: [
      ...(config.module?.rules ?? []),
      {
        test: /\.mjs$/,
        include: /node_modules/,
        type: 'javascript/auto',
      },
      {
        test: /\.(html|md|txt|tmpl|yaml|yml)$/,
        type: 'asset/source',
      },
      {
        test: /\.peggy$/,
        use: {
          loader: resolveModule('@kbn/peggy-loader'),
        },
      },
      {
        test: /\.text$/,
        use: {
          loader: resolveModule('@kbn/dot-text-loader'),
        },
      },
    ],
  },
  plugins: [
    ...(config.plugins ?? []),
    new NodeLibsBrowserPlugin(),
    new IgnoreNotFoundExportPlugin(),
  ],
  resolve: {
    ...config.resolve,
    extensions: ['.js', '.mjs', '.ts', '.tsx', '.json', '.mdx'],
    mainFields: ['browser', 'main'],
    alias: {
      ...config.resolve?.alias,
      core_styles: resolve(REPO_ROOT, 'src/core/public/index.scss'),
    },
  },
  stats: 'errors-only',
});

export const defaultConfig: StorybookConfig = {
  addons: [
    '@kbn/storybook/preset',
    '@storybook/addon-a11y',
    '@storybook/addon-essentials',
    '@storybook/addon-jest',
    '@storybook/addon-docs',
  ],
  stories: ['../**/*.stories.tsx', '../**/*.mdx'],
  framework: 'storybook-react-rsbuild',
  typescript: {
    reactDocgen: false,
  },
  core: {
    disableTelemetry: true,
  },
  rsbuildFinal: async (rsbuildConfig) =>
    mergeRsbuildConfig(
      rsbuildConfig,
      {
        plugins: [
          pluginReact({
            swcReactOptions: {
              importSource: '@emotion/react',
            },
          }),
          pluginSass({
            sassLoaderOptions: {
              additionalData: (content) => `@import ${globalStylesPath};\n${content.toString()}`,
              sassOptions: {
                loadPaths: [REPO_ROOT, resolve(REPO_ROOT, 'node_modules')],
                quietDeps: true,
                silenceDeprecations: ['import', 'legacy-js-api'],
              },
            },
          }),
        ],
        tools: {
          rspack: createRsbuildRspackConfig({
            plugins: [createMockReplacementPlugin(/^\.\//), createMockReplacementPlugin(/^\.\.\//)],
            resolve: {
              fallback: {
                fs: false,
              },
            },
          }),
          swc: {
            jsc: {
              experimental: {
                plugins: [
                  [
                    emotionSwcPlugin,
                    {
                      autoLabel: 'always',
                      labelFormat: '[filename]--[local]',
                    },
                  ],
                ],
              },
            },
          },
        },
      },
      {
        tools: {
          rspack: {
            module: {
              rules: [
                {
                  test: /\.(js|jsx|ts|tsx)$/,
                  exclude: /node_modules/,
                  enforce: 'pre',
                  use: {
                    loader: resolveModule('babel-loader'),
                    options: {
                      babelrc: false,
                      configFile: false,
                      presets: [
                        resolveModule('@kbn/babel-preset/common_preset'),
                        [
                          resolveModule('@emotion/babel-preset-css-prop'),
                          {
                            autoLabel: 'always',
                            labelFormat: '[filename]--[local]',
                          },
                        ],
                      ],
                    },
                  },
                },
              ],
            },
          },
        },
      }
    ),
  previewHead: (head) => `
  ${head}
  <meta name="eui-global" />
  <meta name="emotion" />
  <script>
    const publicPath = window.top.location.pathname.replace(/index\.html$/, '');
    // set the kbn public path values, we create a pointer on the topmost window path since this assignment will happen within an iframe
    window.top.__kbnPublicPath__ = window.__kbnPublicPath__ = { 'kbn-ui-shared-deps-npm': publicPath, 'kbn-ui-shared-deps-src': publicPath, 'kbn-monaco': publicPath };
    window.__kbnHardenPrototypes__ = false;
  </script>
  <script src="kbn-ui-shared-deps-npm.dll.js"></script>
  <script src="kbn-ui-shared-deps-src.js"></script>
  <link href="kbn-ui-shared-deps-src.css" rel="stylesheet" />

  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link
    href="https://fonts.googleapis.com/css2?family=Inter:wght@300..700&family=Roboto+Mono:ital,wght@0,400..700;1,400..700&display=swap"
    rel="stylesheet">

  <meta name="eui-utilities" />
  `,
  staticDirs: [
    UiSharedDepsNpm.distDir,
    UiSharedDepsSrc.distDir,
    `${REPO_ROOT}/target/build/src/platform/packages/shared/kbn-monaco/target_workers`,
    {
      from: `${REPO_ROOT}/src/platform/plugins/shared/kibana_react/public/assets`,
      to: 'plugins/kibanaReact/assets',
    },
  ],
};
