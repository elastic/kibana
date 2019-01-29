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

import { resolve } from 'path';

process.argv.push('--no-exit'); // don't exit after encountering a rule error
process.argv.push('--verbose'); // print results
process.argv.push('--max-warnings', '0'); // return nonzero exit code on any warnings
process.argv.push('--config', resolve(__dirname, '..', '..', '.sass-lint.yml')); // configuration file

// common-js is required so that logic before this executes before loading sass-lint
require('sass-lint/bin/sass-lint');
