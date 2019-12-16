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

import path from 'path';
import { versionSatisfies, cleanVersion } from '../../legacy/utils/version';
import { statSync } from 'fs';

export function existingInstall(settings, logger) {
  try {
    statSync(path.join(settings.pluginDir, settings.plugins[0].name));

    logger.error(
      `Plugin ${settings.plugins[0].name} already exists, please remove before installing a new version`
    );
    process.exit(70);
  } catch (e) {
    if (e.code !== 'ENOENT') throw e;
  }
}

export function assertVersion(settings) {
  if (!settings.plugins[0].kibanaVersion) {
    throw new Error(
      `Plugin package.json is missing both a version property (required) and a kibana.version property (optional).`
    );
  }

  const actual = cleanVersion(settings.plugins[0].kibanaVersion);
  const expected = cleanVersion(settings.version);
  if (!versionSatisfies(actual, expected)) {
    throw new Error(
      `Plugin ${settings.plugins[0].name} [${actual}] is incompatible with Kibana [${expected}]`
    );
  }
}
