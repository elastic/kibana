/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import crypto from 'crypto';
import { join } from 'path';
import { get } from 'lodash';
import { readFileSync } from 'fs';

import { getConfigDirectory } from '@kbn/utils';

export class EncryptionConfig {
  #config = load(readFileSync(join(getConfigDirectory(), 'kibana.yml')));
  #encryptionKeyPaths = [
    'xpack.encryptedSavedObjects.encryptionKey',
    'xpack.reporting.encryptionKey',
    'xpack.security.encryptionKey',
  ];
  #encryptionMeta = {
    'xpack.encryptedSavedObjects.encryptionKey': {
      docs: 'https://www.elastic.co/guide/en/kibana/current/xpack-security-secure-saved-objects.html#xpack-security-secure-saved-objects',
      description: 'Used to encrypt stored objects such as dashboards and visualizations',
    },
    'xpack.reporting.encryptionKey': {
      docs: 'https://www.elastic.co/guide/en/kibana/current/reporting-settings-kb.html#general-reporting-settings',
      description: 'Used to encrypt saved reports',
    },
    'xpack.security.encryptionKey': {
      docs: 'https://www.elastic.co/guide/en/kibana/current/security-settings-kb.html#security-session-and-cookie-settings',
      description: 'Used to encrypt session information',
    },
  };

  _getEncryptionKey(key) {
    return get(this.#config, key);
  }

  _hasEncryptionKey(key) {
    return !!get(this.#config, key);
  }

  _generateEncryptionKey() {
    return crypto.randomBytes(16).toString('hex');
  }

  docs({ comment } = {}) {
    const commentString = comment ? '#' : '';
    let docs = '';
    this.#encryptionKeyPaths.forEach((key) => {
      docs += `${commentString}${key}
    ${commentString}${this.#encryptionMeta[key].description}
    ${commentString}${this.#encryptionMeta[key].docs}
\n`;
    });
    return docs;
  }

  generate({ force = false }) {
    const output = {};
    this.#encryptionKeyPaths.forEach((key) => {
      if (force || !this._hasEncryptionKey(key)) {
        output[key] = this._generateEncryptionKey();
      }
    });
    return output;
  }
}
