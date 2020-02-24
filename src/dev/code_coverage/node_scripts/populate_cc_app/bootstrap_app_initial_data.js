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

import { run } from '@kbn/dev-utils';
import { parseAndPopulate } from './parse_and_populate';

const description = 'Populate the initial data for the code coverage static site.';

const exec = buildNumber => srcFile => destFile => ({ log }) =>
  parseAndPopulate(buildNumber)(srcFile)(destFile)(log);


export const populate = (buildNumber, srcFile, destFile) =>
  run(exec(buildNumber)(srcFile)(destFile), { description });
