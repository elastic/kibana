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
/* eslint no-unused-vars: 0 */

import { run } from '@kbn/dev-utils';
import { parse } from './parse';

export const runBenchmarkApp = _ => run(obj => exec(obj), descriptionAndFlags());

function exec({ flags, log }) {
  // const { line } = administrivia(flags, log);
  const { line } = flags;
  const trimmed = line.trim();
  benchmark(trimmed)(log);
}

function benchmark(line) {
  return log => parse(line)(log);
}
const flags = {
  string: ['line'],
  help: `
--line Required, one line of console output from an ftr run
`,
};
function descriptionAndFlags() {
  return {
    description: `
Run the benchmark 'app'.

Example(s):

# Simple NodeJS one-liner:

eval git log --oneline | while read LINE; do node -p "console.log(process.argv[1])" $LINE; done

# How I'm currently thinking of using this:

eval node scripts/functional_tests --include-tag "ciGroup$CI_GROUP" --config test/functional/config.coverage.js |
  while read LINE; do
    node scripts/perf_test_ftr_benchmark.js --verbose --line $LINE
  done
`,
    flags,
  };
}

// function administrivia(flags, log) {
//   if (flags.line === '') throw createFlagError('Please provide a single --line flag');
//
//   return flags;
// }
