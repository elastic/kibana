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
import convert from './convert';
import send from './send';
import { run, createFlagError } from '@kbn/dev-utils';

const kibanaRoot = resolve(__dirname, '../../../..');
const pipeLog = (f1, f2) => obj => f2(f1(obj), obj);

export function runCodeCoverageConverterCli() {
  run(
    ({ flags, log }) => {
      if (flags.path === '') {
        throw createFlagError('please provide a single --path flag');
      }

      const coverageLocation = resolve(kibanaRoot, flags.path);
      const convertF = convert.bind(null,  coverageLocation);
      const convertAndSend = pipeLog(convertF, send);
      convertAndSend(log);
    },
    {
      description: `
        HTTP Post code coverage in json-summary format to an ES index.
      `,
      flags: {
        string: ['path'],
        help: `
          --path             Required, path to the file to extract coverage data
        `
      },
    }
  );
}
