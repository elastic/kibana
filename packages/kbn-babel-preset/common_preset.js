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

const plugins = [
  require.resolve('babel-plugin-add-module-exports'),
  require.resolve('./transforms/rewrite_absolute_imports'),

  // The class properties proposal was merged with the private fields proposal
  // into the "class fields" proposal. Babel doesn't support this combined
  // proposal yet, which includes private field, so this transform is
  // TECHNICALLY stage 2, but for all intents and purposes it's stage 3
  //
  // See https://github.com/babel/proposals/issues/12 for progress
  require.resolve('@babel/plugin-proposal-class-properties'),

  // Optional Chaining proposal is stage 3 (https://github.com/tc39/proposal-optional-chaining)
  // Need this since we are using TypeScript 3.7+
  require.resolve('@babel/plugin-proposal-optional-chaining'),
  // Nullish coalescing proposal is stage 3 (https://github.com/tc39/proposal-nullish-coalescing)
  // Need this since we are using TypeScript 3.7+
  require.resolve('@babel/plugin-proposal-nullish-coalescing-operator'),
];

module.exports = {
  presets: [require.resolve('@babel/preset-typescript'), require.resolve('@babel/preset-react')],
  plugins,
  overrides: [
    {
      // Babel 7 don't support the namespace feature on typescript code.
      // With namespaces only used for type declarations, we can securely
      // strip them off for babel on x-pack infra/siem plugins
      //
      // See https://github.com/babel/babel/issues/8244#issuecomment-466548733
      test: [
        /x-pack[\/\\]legacy[\/\\]plugins[\/\\]infra[\/\\].*[\/\\]graphql/,
        /x-pack[\/\\]legacy[\/\\]plugins[\/\\]siem[\/\\].*[\/\\]graphql/,
      ],
      plugins: [[require.resolve('babel-plugin-typescript-strip-namespaces')]],
    },
  ],
};
