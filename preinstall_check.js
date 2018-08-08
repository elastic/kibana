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

const isUsingNpm = process.env.npm_config_git !== undefined;

if (isUsingNpm) {
  throw `Use Yarn instead of npm, see Kibana's contributing guidelines`;
}

// The value of the `npm_config_argv` env for each command:
//
// - `npm install`: '{"remain":[],"cooked":["install"],"original":[]}'
// - `yarn`: '{"remain":[],"cooked":["install"],"original":[]}'
// - `yarn kbn bootstrap`: '{"remain":[],"cooked":["run","kbn"],"original":["kbn","bootstrap"]}'
const rawArgv = process.env.npm_config_argv;

if (rawArgv === undefined) {
  return;
}

try {
  const argv = JSON.parse(rawArgv);

  if (argv.cooked.includes('kbn')) {
    // all good, trying to install deps using `kbn`
    return;
  }

  if (argv.cooked.includes('install')) {
    console.log('\nWARNING: When installing dependencies, prefer `yarn kbn bootstrap`\n');
  }
} catch (e) {
  // if it fails we do nothing, as this is just intended to be a helpful message
}
