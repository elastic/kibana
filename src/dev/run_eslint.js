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

import { parse } from 'eslint/lib/options';

const options = parse(process.argv);
process.env.KIBANA_RESOLVER_HARD_CACHE = 'true';

if (!options._.length && !options.printConfig) {
  process.argv.push('.');
}

if (!process.argv.includes('--no-cache')) {
  process.argv.push('--cache');
}

if (!process.argv.includes('--ext')) {
  process.argv.push('--ext', '.js,.ts,.tsx');
}

// common-js is required so that logic before this executes before loading eslint
require('eslint/bin/eslint');
