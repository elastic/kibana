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

import { statSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';

export function list(pluginDir, logger) {
  readdirSync(pluginDir).forEach((name) => {
    const stat = statSync(join(pluginDir, name));

    if (stat.isDirectory() && name[0] !== '.') {
      try {
        const packagePath = join(pluginDir, name, 'kibana.json');
        const pkg = JSON.parse(readFileSync(packagePath, 'utf8'));
        logger.log(pkg.id + '@' + pkg.version);
      } catch (e) {
        throw new Error('Unable to read kibana.json file for plugin ' + name);
      }
    }
  });

  logger.log(''); //intentional blank line for aesthetics
}
