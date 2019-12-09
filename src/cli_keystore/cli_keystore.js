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

import { join } from 'path';

import { pkg } from '../core/server/utils';
import Command from '../cli/command';
import { getDataPath } from '../core/server/path';
import { Keystore } from '../legacy/server/keystore';

const path = join(getDataPath(), 'kibana.keystore');
const keystore = new Keystore(path);

import { createCli } from './create';
import { listCli } from './list';
import { addCli } from './add';
import { removeCli } from './remove';

const program = new Command('bin/kibana-keystore');

program
  .version(pkg.version)
  .description('A tool for managing settings stored in the Kibana keystore');

createCli(program, keystore);
listCli(program, keystore);
addCli(program, keystore);
removeCli(program, keystore);

program.parse(process.argv);

if (!program.args.length) {
  program.help();
}
