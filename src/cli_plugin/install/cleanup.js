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

import del from 'del';
import fs from 'fs';

export function cleanPrevious(settings, logger) {
  return new Promise(function(resolve, reject) {
    try {
      fs.statSync(settings.workingPath);

      logger.log('Found previous install attempt. Deleting...');
      try {
        del.sync(settings.workingPath, { force: true });
      } catch (e) {
        reject(e);
      }
      resolve();
    } catch (e) {
      if (e.code !== 'ENOENT') reject(e);

      resolve();
    }
  });
}

export function cleanArtifacts(settings) {
  // delete the working directory.
  // At this point we're bailing, so swallow any errors on delete.
  try {
    del.sync(settings.workingPath);
    del.sync(settings.plugins[0].path);
  } catch (e) {} // eslint-disable-line no-empty
}
