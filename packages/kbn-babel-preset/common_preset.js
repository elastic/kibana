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

module.exports = {
  presets: [
    require.resolve('babel-preset-react'),
  ],
  plugins: [
    require.resolve('babel-plugin-add-module-exports'),
    // stage 3
    require.resolve('babel-plugin-transform-async-generator-functions'),
    require.resolve('babel-plugin-transform-object-rest-spread'),

    // the class properties proposal was merged with the private fields proposal
    // into the "class fields" proposal. Babel doesn't support this combined
    // proposal yet, which includes private field, so this transform is
    // TECHNICALLY stage 2, but for all intents and purposes it's stage 3
    //
    // See https://github.com/babel/proposals/issues/12 for progress
    require.resolve('babel-plugin-transform-class-properties'),
  ],
};
