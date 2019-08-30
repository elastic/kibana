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

/**
 * Create the node/webpack/jest presets.
 *
 * @param {boolean} options.webpack
 * @param {boolean} options.filterPolyfills
 * @param {Record<string,string>} options.define
 */
exports.createPreset = (options) => () => ({
  presets: [
    [
      require.resolve('@babel/preset-env'),
      {
        /**
         * disable module transformation in webpack so that we can setup transformation
         * of everything but async imports below, in the plugins
         */
        modules: options.webpack ? false : 'cjs',

        /**
         * only applies the necessary transformations based on the
         * current node.js processes version. For example: running
         * `nvm install 8 && node ./src/cli` will run kibana in node
         * version 8 and babel will stop transpiling async/await
         * because they are supported in the "current" version of node
         *
         * not defining a 'targets' causes babel to lookup the .browserlistrc
         * file and default to the features described there.
         */
        ...(!options.webpack && {
          targets: {
            node: 'current',
          },
        }),

        /**
         * replaces `import "core-js/stable"` and `import 'regenerator-runtime/runtime'`
         * with a list of require statements for just the polyfills that the target
         * versions don't already support
         */
        ...(options.filterPolyfills && {
          useBuiltIns: 'entry',
          corejs: 3,
        }),
      }
    ],

    require.resolve('@babel/preset-typescript'),
    require.resolve('@babel/preset-react')
  ],
  plugins: [
    require.resolve('@kbn/elastic-idx/babel'),
    require.resolve('babel-plugin-add-module-exports'),

    /**
     * The class properties proposal was merged with the private fields proposal
     * into the "class fields" proposal. Babel doesn't support this combined
     * proposal yet, which includes private field, so this transform is
     * TECHNICALLY stage 2, but for all intents and purposes it's stage 3
     *
     * See https://github.com/babel/proposals/issues/12 for progress
     */
    require.resolve('@babel/plugin-proposal-class-properties'),

    /**
     * optionally rewrite some variable accesses with constant values
     */
    ...(options.define ? [
      [
        require.resolve('babel-plugin-transform-define'),
        options.define
      ]
    ] : []),

    /**
     * tell babel to transform all imports to commonjs other than async import using
     * the commonjs module transform but only the syntax for async/dynamic import
     */
    ...(options.webpack ? [
      require.resolve('@babel/plugin-transform-modules-commonjs'),
      require.resolve('@babel/plugin-syntax-dynamic-import'),
    ] : []),
  ],
  overrides: [
    {
      /**
       * Babel 7 don't support the namespace feature on typescript code. With namespaces
       * only used for type declarations, we can securely strip them off for babel on
       * x-pack infra/siem plugins
       *
       * See https://github.com/babel/babel/issues/8244#issuecomment-466548733
       */
      test: [
        /x-pack[\/\\]legacy[\/\\]plugins[\/\\]infra[\/\\].*[\/\\]graphql/,
        /x-pack[\/\\]legacy[\/\\]plugins[\/\\]siem[\/\\].*[\/\\]graphql/,
      ],
      plugins: [
        require.resolve('babel-plugin-typescript-strip-namespaces')
      ],
    },
  ],
});
