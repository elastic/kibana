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

// unless we are running a prebuilt/distributable version of
// kibana, automatically transpile typescript to js before babel
if (!global.__BUILT_WITH_BABEL__) {
  var resolve = require('path').resolve;
  require('ts-node').register({
    transpileOnly: true,
    cacheDirectory: resolve(__dirname, '../../../optimize/.cache/ts-node')
  });
}

// register and polyfill need to happen in this
// order and in separate files. Checkout each file
// for a much more detailed explanation
require('./register');
require('./polyfill');
