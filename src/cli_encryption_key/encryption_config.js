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

import crypto from 'crypto';
import { join } from 'path';
import { get } from 'lodash';
import { readFileSync } from 'fs';
import { safeLoad } from 'js-yaml';

import { getConfigDirectory } from '@kbn/utils';

export class EncryptionConfig {
#config = safeLoad(readFileSync(join(getConfigDirectory(), 'kibana.yml')));
#encryptionKeyPaths = [
  'xpack.encryptedSavedObjects.encryptionKey',
  'xpack.reporting.encryptionKey',
  'xpack.security.encryptionKey',
];

  _getEncryptionKey(key) {
    return get(this._config, key);
  }

  _hasEncryptionKey(key) {
    return !!get(this._config, key);
  }

  _generateEncryptionKey() {
    return crypto.randomBytes(16).toString('hex');
  }

  generate({ force = false }) {
    const output = {};
    this._encryptionKeyPaths.forEach((key) => {
      if (force || !this._hasEncryptionKey(key)) {
        output[key] = this._generateEncryptionKey();
      }
    });
    return output;
  }
}
