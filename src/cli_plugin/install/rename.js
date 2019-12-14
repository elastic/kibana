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

import { rename } from 'fs';
import { delay } from 'lodash';

export function renamePlugin(workingPath, finalPath) {
  return new Promise(function(resolve, reject) {
    const start = Date.now();
    const retryTime = 3000;
    const retryDelay = 100;
    rename(workingPath, finalPath, function retry(err) {
      if (err) {
        // In certain cases on Windows, such as running AV, plugin folders can be locked shortly after extracting
        // Retry for up to retryTime seconds
        const windowsEPERM = process.platform === 'win32' && err.code === 'EPERM';
        const retryAvailable = Date.now() - start < retryTime;
        if (windowsEPERM && retryAvailable)
          return delay(rename, retryDelay, workingPath, finalPath, retry);
        reject(err);
      }
      resolve();
    });
  });
}
