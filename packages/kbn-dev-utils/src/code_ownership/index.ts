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

import { createFlagError, run, RunContext } from '../run';
import { rules } from './ownership_config';
import { record } from './record';

const description = `

Create .github/CODEOWNERS file from authoritative source

`;

export const generateCodeOwners = () => {
  run(
    ({ flags, log }: RunContext) => {
      if (flags.codeOwnersPath === '')
        throw createFlagError('please provide a single --codeOwnersPath flag');

      record(flags.codeOwnersPath as string, log, rules);
    },
    {
      description,
      flags: {
        string: ['codeOwnersPath'],
        help: `
--codeOwnersPath       Required, path to CODEOWNERS file.
        `,
      },
    }
  );
};
