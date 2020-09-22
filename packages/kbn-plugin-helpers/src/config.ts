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

import Path from 'path';

import loadJsonFile from 'load-json-file';

import { ToolingLog } from '@kbn/dev-utils';
import { Plugin } from './load_kibana_platform_plugin';

export interface Config {
  skipInstallDependencies: boolean;
  serverSourcePatterns?: string[];
}

const isArrayOfStrings = (v: any): v is string[] =>
  Array.isArray(v) && v.every((p) => typeof p === 'string');

export async function loadConfig(log: ToolingLog, plugin: Plugin): Promise<Config> {
  try {
    const path = Path.resolve(plugin.directory, '.kibana-plugin-helpers.json');
    const file = await loadJsonFile(path);

    if (!(typeof file === 'object' && file && !Array.isArray(file))) {
      throw new TypeError(`expected config at [${path}] to be an object`);
    }

    const {
      skipInstallDependencies = false,
      buildSourcePatterns,
      serverSourcePatterns,
      ...rest
    } = file;

    if (typeof skipInstallDependencies !== 'boolean') {
      throw new TypeError(`expected [skipInstallDependencies] at [${path}] to be a boolean`);
    }

    if (buildSourcePatterns) {
      log.warning(
        `DEPRECATED: rename [buildSourcePatterns] to [serverSourcePatterns] in [${path}]`
      );
    }
    const ssp = buildSourcePatterns || serverSourcePatterns;
    if (ssp !== undefined && !isArrayOfStrings(ssp)) {
      throw new TypeError(`expected [serverSourcePatterns] at [${path}] to be an array of strings`);
    }

    if (Object.keys(rest).length) {
      throw new TypeError(`unexpected key in [${path}]: ${Object.keys(rest).join(', ')}`);
    }

    log.info(`Loaded config file from [${path}]`);
    return {
      skipInstallDependencies,
      serverSourcePatterns: ssp,
    };
  } catch (error) {
    if (error.code === 'ENOENT') {
      return {
        skipInstallDependencies: false,
      };
    }

    throw error;
  }
}
