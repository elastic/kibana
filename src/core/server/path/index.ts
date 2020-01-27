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
import { accessSync, constants } from 'fs';
import { TypeOf, schema } from '@kbn/config-schema';
import { fromRoot } from '../utils';

const isString = (v: any): v is string => typeof v === 'string';

const CONFIG_PATHS = [
  process.env.KIBANA_PATH_CONF && join(process.env.KIBANA_PATH_CONF, 'kibana.yml'),
  process.env.CONFIG_PATH, // deprecated
  fromRoot('config/kibana.yml'),
  '/etc/kibana/kibana.yml',
].filter(isString);

const DATA_PATHS = [
  process.env.DATA_PATH, // deprecated
  fromRoot('data'),
  '/var/lib/kibana',
].filter(isString);

function findFile(paths: string[]) {
  const availablePath = paths.find(configPath => {
    try {
      accessSync(configPath, constants.R_OK);
      return true;
    } catch (e) {
      // Check the next path
    }
  });
  return availablePath || paths[0];
}

/**
 * Get the path where the config files are stored
 * @internal
 */
export const getConfigPath = () => findFile(CONFIG_PATHS);
/**
 * Get the path where the data can be stored
 * @internal
 */
export const getDataPath = () => findFile(DATA_PATHS);

export type PathConfigType = TypeOf<typeof config.schema>;

export const config = {
  path: 'path',
  schema: schema.object({
    data: schema.string({ defaultValue: () => getDataPath() }),
  }),
};
