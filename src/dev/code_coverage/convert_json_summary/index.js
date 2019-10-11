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

const kibanaRoot = resolve(__dirname, '../../../..');

import { run, createFlagError } from '@kbn/dev-utils';

export function runCodeCoverageConverterCli() {
  run(
    ({ flags, log }) => {
      if (flags.path === '') {
        throw createFlagError('please provide a single --path flag');
      }
      const coverageLocation = resolve(kibanaRoot, flags.path);
      send(convert(coverageLocation, log), log);
    },
    {
      description: `
        Massage code coverage json-summary format into a format suitable to POSTing to an ES index.
      `,
      flags: {
        string: ['path'],
        help: `
          --path             Required, path to the file to operate on
        `
      },
    }
  );
}
