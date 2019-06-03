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

module.exports = () => {
  return {
    presets: [
      [
        require.resolve('@babel/preset-env'),
        {
          targets: {
            // only applies the necessary transformations based on the
            // current node.js processes version. For example: running
            // `nvm install 8 && node ./src/cli` will run kibana in node
            // version 8 and babel will stop transpiling async/await
            // because they are supported in the "current" version of node
            node: 'current',
          },

          // replaces `import "@babel/polyfill"` with a list of require statements
          // for just the polyfills that the target versions don't already supply
          // on their own
          useBuiltIns: 'entry',
          modules: 'cjs',
          corejs: 2,
        },
      ],
      require('./common_preset'),
    ],
    plugins: [
      [
        require.resolve('babel-plugin-transform-define'),
        {
          'global.__BUILT_WITH_BABEL__': 'true'
        }
      ]
    ]
  };
};
