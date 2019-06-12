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
import { accessSync, R_OK } from 'fs';
import { find } from 'lodash';
import { fromRoot } from '../../utils';

const CONFIG_PATHS = [
  process.env.KIBANA_PATH_CONF && join(process.env.KIBANA_PATH_CONF, 'kibana.yml'),
  process.env.CONFIG_PATH, //deprecated
  fromRoot('config/kibana.yml'),
  '/etc/kibana/kibana.yml'
].filter(Boolean);

const DATA_PATHS = [
  process.env.DATA_PATH, //deprecated
  fromRoot('data'),
  '/var/lib/kibana'
].filter(Boolean);

function findFile(paths) {
  const availablePath = find(paths, configPath => {
    try {
      accessSync(configPath, R_OK);
      return true;
    } catch (e) {
      //Check the next path
    }
  });
  return availablePath || paths[0];
}

export const getConfig = () => findFile(CONFIG_PATHS);
export const getData = () => findFile(DATA_PATHS);
