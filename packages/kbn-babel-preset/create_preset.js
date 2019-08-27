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

const merge = (...objects) => {
  const result = {};
  for (const obj of objects) {
    for (const [key, value] of Object.entries(obj || {})) {
      if (value === undefined) {
        delete result[key];
      } else {
        result[key] = value;
      }
    }
  }
  return result;
};

const stripFalsey = array => array.filter(Boolean);

/**
 * Define a babel preset that can be used to build Kibana source code for
 * different environments. A few options can be provided to modify config
 * based on the requirements of the environment.
 *
 * @param {options.node} boolean - set to `true` if the target runtime Node.js,
 *    `false` if the target runtime is the browser
 * @param {options.filterPolyfills} boolean - set to `true` if polyfills loaded
 *    by `core-js/stable` and `regenerator-runtime/runtime` should be filtered
 *    based on the target runtime
 * @param {options.dynamicImports} boolean - set to `true` if we should enable
 *    async/dynamic import support in the code
 * @param {options.define} object - use this object to define variables that
 *    should be replaced in the code (keys in the object) with constant values
 *    (values in the object)
 */
module.exports = (options) => ({
  presets: [
    require.resolve('@babel/preset-typescript'),
    require.resolve('@babel/preset-react'),
    [
      require.resolve('@babel/preset-env'),
      merge(
        {
          modules: 'cjs',
        },

        // only applies the necessary transformations based on the
        // current node.js processes version. For example: running
        // `nvm install 8 && node ./src/cli` will run kibana in node
        // version 8 and babel will stop transpiling async/await
        // because they are supported in the "current" version of node
        options.node && {
          targets: {
            node: 'current',
          },
        },

        // replaces `import "core-js/stable"` and `import "regenerator-runtime/runtime"`
        // with a list of require statements for just the polyfills needed based on
        // the target environment
        options.filterPolyfills && {
          useBuiltIns: 'entry',
          corejs: 3,
        },
      )
    ]
  ],

  plugins: stripFalsey([
    require.resolve('@kbn/elastic-idx/babel'),
    require.resolve('babel-plugin-add-module-exports'),

    // The class properties proposal was merged with the private fields proposal
    // into the "class fields" proposal. Babel doesn't support this combined
    // proposal yet, which includes private field, so this transform is
    // TECHNICALLY stage 2, but for all intents and purposes it's stage 3
    //
    // See https://github.com/babel/proposals/issues/12 for progress
    require.resolve('@babel/plugin-proposal-class-properties'),

    // enables babel to parse and execute dynamic import() calls
    options.dynamicImports && require.resolve('@babel/plugin-syntax-dynamic-import'),

    // enabled use of dymanic imports in node, necessary for jest
    options.dynamicImports && options.node && require.resolve('babel-plugin-dynamic-import-node'),

    // replaces specific variables in the code with constant value
    options.define && [
      require.resolve('babel-plugin-transform-define'),
      options.define
    ]
  ]),

  overrides: [
    {
      // Babel 7 does not support the namespace feature on typescript code.
      // With namespaces only used for type declarations, we can securely
      // strip them off for babel on x-pack infra/siem plugins
      //
      // See https://github.com/babel/babel/issues/8244#issuecomment-466548733
      //
      // See https://babeljs.io/docs/en/options#matchpattern for matching/wildcard rules
      test: [
        '**/x-pack/legacy/plugins/infra/**/graphql/**',
        '**/x-pack/legacy/plugins/siem/**/graphql/**',
      ],
      plugins: [
        require.resolve('babel-plugin-typescript-strip-namespaces')
      ],
    },
  ],
});
