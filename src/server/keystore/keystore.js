import { writeFileSync, readFileSync, existsSync } from 'fs';
import { createCipher, createDecipher } from 'crypto';
import * as errors from './errors';

const VERSION = 1;
const ALGORITHM = 'aes-256-gcm';

export class Keystore {
  constructor(path, password = '') {
    this.path = path;
    this.data = {};
    this.password = password;

    this.load();
  }

  static errors = errors;

  static encrypt(data, password = '') {
    const cipher = createCipher(ALGORITHM, password);

    let ciphertext = cipher.update(data, 'utf8', 'hex');
    ciphertext += cipher.final('hex');

    return {
      ciphertext,
      tag: cipher.getAuthTag().toString('hex')
    };
  }

  static decrypt(ciphertext, tag, password = '') {
    try {
      const decipher = createDecipher(ALGORITHM, password);
      decipher.setAuthTag(new Buffer(tag, 'hex'));

      let text = decipher.update(ciphertext, 'hex', 'utf8');
      text += decipher.final('utf8');

      return text;
    } catch (e) {
      throw new errors.UnableToReadKeystore();
    }
  }

  save() {
    const text = JSON.stringify(this.data);
    const keystore = {
      version: VERSION,
      ...Keystore.encrypt(text, this.password)
    };

    writeFileSync(this.path, JSON.stringify(keystore));
  }

  load() {
    try {
      const keystore = readFileSync(this.path);
      const data = JSON.parse(keystore.toString());

      this.data = JSON.parse(Keystore.decrypt(data.ciphertext, data.tag, this.password));
    } catch (e) {
      if (e.code === 'ENOENT') {
        return;
      }

      throw e;
    }
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
}
