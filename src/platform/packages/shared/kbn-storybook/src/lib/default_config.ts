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
import type { StorybookConfig as BaseStorybookConfig } from '@storybook/react-webpack5';
import type { TypescriptOptions } from '@storybook/preset-react-webpack';
import webpack from 'webpack';
import { resolve } from 'path';
import UiSharedDepsNpm from '@kbn/ui-shared-deps-npm';
import * as UiSharedDepsSrc from '@kbn/ui-shared-deps-src';
import ReactRefreshWebpackPlugin from '@pmmmwh/react-refresh-webpack-plugin';
import { REPO_ROOT } from './constants';
import { default as WebpackConfig } from '../webpack.config';

const MOCKS_DIRECTORY = '__storybook_mocks__';
const EXTENSIONS = ['.ts', '.js', '.tsx'];

/*
 * false is a valid option for typescript.reactDocgen,
 * but it is not in the type definition
 */
interface StorybookConfig extends BaseStorybookConfig {
  typescript: Partial<TypescriptOptions>;
}

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
    '@kbn/storybook/preset',
    '@storybook/addon-a11y',
    '@storybook/addon-webpack5-compiler-babel',
    // https://storybook.js.org/docs/essentials
    '@storybook/addon-essentials',
    '@storybook/addon-jest',
    {
      /**
       * This addon replaces rules in the default SB webpack config
       * to avoid duplicate rule issues caused by directly using the rules
       * in the custom webpack config.
       */
      name: '@storybook/addon-styling-webpack',
      options: {
        rules: [
          {
            test: /\.css$/,
            use: ['style-loader', 'css-loader'],
          },
          {
            test: /\.scss$/,
            exclude: /\.module.(s(a|c)ss)$/,
            use: [
              { loader: 'style-loader' },
              { loader: 'css-loader', options: { importLoaders: 2 } },
              {
                loader: 'postcss-loader',
                options: {
                  postcssOptions: {
                    config: require.resolve('@kbn/optimizer/postcss.config'),
                  },
                },
              },
              {
                loader: 'sass-loader',
                options: {
                  additionalData(content: string, loaderContext: any) {
                    const req = JSON.stringify(
                      loaderContext.utils.contextify(
                        loaderContext.context || loaderContext.rootContext,
                        resolve(REPO_ROOT, 'src/core/public/styles/core_app/_globals_v8light.scss')
                      )
                    );
                    return `@import ${req};\n${content}`;
                  },
                  implementation: require('sass-embedded'),
                  sassOptions: {
                    includePaths: [resolve(REPO_ROOT, 'node_modules')],
                    quietDeps: true,
                    silenceDeprecations: ['import', 'legacy-js-api'],
                  },
                },
              },
            ],
          },
        ],
      },
    },
  ],
  stories: ['../**/*.stories.tsx', '../**/*.mdx'],
  framework: {
    name: '@storybook/react-webpack5',
    options: {},
  },
  typescript: {
    reactDocgen: false,
  },
  core: {
    disableTelemetry: true,
  },
  async babel(config: any, options: any) {
    if (!config?.presets) {
      config.presets = [];
    }

    config.presets.push(
      require.resolve('@kbn/babel-preset/common_preset'),
      [
        require.resolve('@emotion/babel-preset-css-prop'),
        {
          // There's an issue where emotion classnames may be duplicated,
          // (e.g. `[hash]-[filename]--[local]_[filename]--[local]`)
          // https://github.com/emotion-js/emotion/issues/2417
          autoLabel: 'always',
          labelFormat: '[filename]--[local]',
        },
      ],
      {
        plugins: [
          process.env.NODE_ENV !== 'production' && require.resolve('react-refresh/babel'),
        ].filter(Boolean),
      }
    );

    return config;
  },
  webpackFinal: (config, options) => {
    if (process.env.CI) {
      config.parallelism = 4;
      config.cache = true;
    }

    // required for react refresh
    config.target = 'web';

    // This will go over every component which is imported and check its import statements.
    // For every import which starts with ./ it will do a check to see if a file with the same name
    // exists in the __storybook_mocks__ folder. If it does, use that import instead.
    // This allows you to mock hooks and functions when rendering components in Storybook.
    // It is akin to Jest's manual mocks (__mocks__).
    config.plugins?.push(
      new webpack.NormalModuleReplacementPlugin(/^\.\//, async (resource: any) => {
        if (!resource.contextInfo.issuer?.includes('node_modules')) {
          const mockedPath = path.resolve(resource.context, MOCKS_DIRECTORY, resource.request);

          EXTENSIONS.forEach((ext) => {
            const isReplacementPathExists = fs.existsSync(mockedPath + ext);

            if (isReplacementPathExists) {
              const newImportPath = './' + path.join(MOCKS_DIRECTORY, resource.request);
              resource.request = newImportPath;
            }
          });
        }
      })
    );

    // Same, but for imports statements which import modules outside of the directory (../)
    config.plugins?.push(
      new webpack.NormalModuleReplacementPlugin(/^\.\.\//, async (resource: any) => {
        if (!resource.contextInfo.issuer?.includes('node_modules')) {
          const prs = path.parse(resource.request);

          const mockedPath = path.resolve(resource.context, prs.dir, MOCKS_DIRECTORY, prs.base);

          EXTENSIONS.forEach((ext) => {
            const isReplacementPathExists = fs.existsSync(mockedPath + ext);

            if (isReplacementPathExists) {
              const newImportPath = prs.dir + '/' + path.join(MOCKS_DIRECTORY, prs.base);
              resource.request = newImportPath;
            }
          });
        }
      })
    );

    if (process.env.NODE_ENV !== 'production') {
      config.plugins?.push(
        new ReactRefreshWebpackPlugin({
          overlay: false,
        })
      );
    }

    config.resolve = {
      ...config.resolve,
      fallback: {
        ...config?.resolve?.fallback,
        fs: false,
      },
    };

    config.watchOptions = {
      ...config.watchOptions,
      ignored: IGNORE_GLOBS,
    };

    return WebpackConfig({ config });
  },
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
    `${REPO_ROOT}/bazel-bin/src/platform/packages/shared/kbn-monaco/target_workers`,
    {
      from: `${REPO_ROOT}/src/platform/plugins/shared/kibana_react/public/assets`,
      to: 'plugins/kibanaReact/assets',
    },
  ],
};
