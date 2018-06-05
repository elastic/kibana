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

import getopts from 'getopts';
import { startServers } from '../../../';
import { processOptions, displayHelp } from './args';

/**
 * Start servers
 * @param {string} defaultConfigPath Path to config to use
 *                                   if no config option is passed
 */
export async function startServersCli(defaultConfigPath) {
  try {
    const userOptions = getopts(process.argv.slice(2)) || {};
    if (userOptions.help) return displayHelp();

    const options = processOptions(userOptions, defaultConfigPath);
    const { config } = options;
    await startServers(config, options);
  } catch (err) {
    console.error('FATAL ERROR');
    console.error(err);
    process.exit(1);
  }
}
