/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { writeFileSync, readFileSync, existsSync } from 'fs';
import { createCipheriv, createDecipheriv, randomBytes, pbkdf2Sync } from 'crypto';
import { question } from './utils/prompt';
import * as errors from './errors';

const VERSION = 1;
const ALGORITHM = 'aes-256-gcm';
const ITERATIONS = 10000;

export class Keystore {
  static async initialize(path, password) {
    const keystore = new Keystore(path, password);
    await keystore.load();
    return keystore;
  }

  constructor(path, password = '') {
    this.path = path;
    this.password = password;
    this.reset();
  }

  static errors = errors;

  static encrypt(text, password = '') {
    const iv = randomBytes(12);
    const salt = randomBytes(64);
    const key = pbkdf2Sync(password, salt, ITERATIONS, 32, 'sha512');

    const cipher = createCipheriv(ALGORITHM, key, iv);

    const ciphertext = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();

    return Buffer.concat([salt, iv, tag, ciphertext]).toString('base64');
  }

  static decrypt(data, password = '') {
    try {
      const bData = Buffer.from(data, 'base64');

      // convert data to buffers
      const salt = bData.slice(0, 64);
      const iv = bData.slice(64, 76);
      const tag = bData.slice(76, 92);
      const text = bData.slice(92);

      const key = pbkdf2Sync(password, salt, ITERATIONS, 32, 'sha512');

      const decipher = createDecipheriv(ALGORITHM, key, iv);
      decipher.setAuthTag(tag);

      return decipher.update(text, 'binary', 'utf8') + decipher.final('utf8');
    } catch (e) {
      throw new errors.UnableToReadKeystore();
    }
  }

  save() {
    const text = JSON.stringify(this.data);

    // The encrypted text and the version are colon delimited to make
    // it easy to visually read the version as we could have easily
    // included it with the buffer

    const keystore = [VERSION, Keystore.encrypt(text, this.password)].join(':');

    writeFileSync(this.path, keystore);
  }

  async load() {
    try {
      if (this.hasPassword() && !this.password) {
        if (process.env.KBN_KEYSTORE_PASSPHRASE_FILE) {
          this.password = readFileSync(process.env.KBN_KEYSTORE_PASSPHRASE_FILE, {
            encoding: 'utf8',
          }).trim();
        } else if (process.env.KEYSTORE_PASSWORD) {
          this.password = process.env.KEYSTORE_PASSWORD;
        } else {
          this.password = await question('Enter password for the kibana keystore', {
            mask: '*',
          });
        }
      }
      const keystore = readFileSync(this.path);
      const [, data] = keystore.toString().split(':');
      this.data = JSON.parse(Keystore.decrypt(data, this.password));
    } catch (e) {
      if (e.code === 'ENOENT') {
        return;
      }

      throw e;
    }
  }

  reset() {
    this.data = {};
  }

  exists() {
    return existsSync(this.path);
  }

  keys() {
    return Object.keys(this.data);
  }

  has(key) {
    return this.keys().indexOf(key) > -1;
  }

  add(key, value) {
    this.data[key] = value;
  }

  remove(key) {
    delete this.data[key];
  }

  hasPassword() {
    try {
      const keystore = readFileSync(this.path);
      const [, data] = keystore.toString().split(':');
      Keystore.decrypt(data);
    } catch (e) {
      if (e instanceof errors.UnableToReadKeystore) {
        return true;
      }
    }
    return false;
  }

  setPassword(password) {
    this.password = password;
  }
}
