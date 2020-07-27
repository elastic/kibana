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

import { run } from '../run';
import { parseSourceOfTruth } from './parse';
import { sourceOfTruth as sot } from './owners_source_of_truth';
import { flush } from './flush';
import { ToolingLog } from '../tooling_log';

const codeownersPath: string | undefined = process.env.CODEOWNERS_PATH;
const description = `

Create .github/CODEOWNERS file from authoritative source

`;

export const buildPathsMap = () => parseSourceOfTruth(sot as []);

export const defineCodeOwners = () => {
  run(({ log }) => flush(codeownersPath)(log as ToolingLog)(buildPathsMap()), {
    description,
  });
};
