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

const mockProtectedKeystoreData =
  '1:4BnWfydL8NwFIQJg+VQKe0jlIs7uXtty6+++yaWPbSB' +
  'KIX3d9nPfQ20K1C6Xh26E/gMJAQ9jh7BxK0+W3lt/iDJBJn44wqX3pQ0189iGkNBL0ibDCc' +
  'tz4mRy6+hqwiLxiukpH8ELAJsff8LNNHr+gNzX/2k/GvB7nQ==';

const mockUnprotectedKeystoreData =
  '1:IxR0geiUTMJp8ueHDkqeUJ0I9eEw4NJPXIJi22UDy' +
  'fGfJSy4mHBBuGPkkAix/x/YFfIxo4tiKGdJ2oVTtU8LgKDkVoGdL+z7ylY4n3myatt6osqh' +
  'I4lzJ9MRy21UcAJki2qFUTj4TYuvhta3LId+RM5UX/dJ2468hQ==';

jest.mock('fs', () => ({
  readFileSync: jest.fn().mockImplementation(path => {
    if (path.includes('data/unprotected')) {
      return JSON.stringify(mockUnprotectedKeystoreData);
    }

    if (path.includes('data/protected')) {
      return JSON.stringify(mockProtectedKeystoreData);
    }

    if (path.includes('data/test') || path.includes('data/nonexistent')) {
      throw { code: 'ENOENT' };
    }

    throw { code: 'EACCES' };
  }),
  existsSync: jest.fn().mockImplementation(path => {
    return (
      path.includes('data/unprotected') ||
      path.includes('data/protected') ||
      path.includes('inaccessible')
    );
  }),
  writeFileSync: jest.fn(),
}));

import sinon from 'sinon';
import { readFileSync } from 'fs';

import { Keystore } from './keystore';

describe('Keystore', () => {
  const sandbox = sinon.createSandbox();

  afterEach(() => {
    sandbox.restore();
  });

  describe('save', () => {
    it('thows permission denied', () => {
      expect.assertions(1);
      const path = '/inaccessible/test.keystore';

      try {
        const keystore = new Keystore(path);
        keystore.save();
      } catch (e) {
        expect(e.code).toEqual('EACCES');
      }
    });

    it('creates keystore with version', () => {
      const path = '/data/test.keystore';

      const keystore = new Keystore(path);
      keystore.save();

      readFileSync.mockReturnValueOnce(mockProtectedKeystoreData);
      const fileBuffer = readFileSync(path);
      const contents = fileBuffer.toString();
      const [version, data] = contents.split(':');

      expect(version).toEqual('1');
      expect(data.length).toBeGreaterThan(100);
    });
  });

  describe('load', () => {
    it('is called on initialization', () => {
      const load = sandbox.spy(Keystore.prototype, 'load');

      new Keystore('/data/protected.keystore', 'changeme');

      expect(load.calledOnce).toBe(true);
    });

    it('can load a password protected keystore', () => {
      const keystore = new Keystore('/data/protected.keystore', 'changeme');
      expect(keystore.data).toEqual({ 'a1.b2.c3': 'foo', a2: 'bar' });
    });

    it('throws unable to read keystore', () => {
      expect.assertions(1);
      try {
        new Keystore('/data/protected.keystore', 'wrongpassword');
      } catch (e) {
        expect(e).toBeInstanceOf(Keystore.errors.UnableToReadKeystore);
      }
    });

    it('gracefully handles keystore not found', () => {
      new Keystore('/data/nonexistent.keystore');
    });
  });

  describe('reset', () => {
    it('clears the data', () => {
      const keystore = new Keystore('/data/protected.keystore', 'changeme');
      keystore.reset();
      expect(keystore.data).toEqual({});
    });
  });

  describe('keys', () => {
    it('lists object keys', () => {
      const keystore = new Keystore('/data/unprotected.keystore');
      const keys = keystore.keys();

      expect(keys).toEqual(['a1.b2.c3', 'a2']);
    });
  });

  describe('has', () => {
    it('returns true if key exists', () => {
      const keystore = new Keystore('/data/unprotected.keystore');

      expect(keystore.has('a2')).toBe(true);
    });

    it('returns false if key does not exist', () => {
      const keystore = new Keystore('/data/unprotected.keystore');

      expect(keystore.has('invalid')).toBe(false);
    });
  });

  describe('add', () => {
    it('adds a key/value pair', () => {
      const keystore = new Keystore('/data/unprotected.keystore');
      keystore.add('a3', 'baz');

      expect(keystore.data).toEqual({
        'a1.b2.c3': 'foo',
        a2: 'bar',
        a3: 'baz',
      });
    });
  });

  describe('remove', () => {
    it('removes a key/value pair', () => {
      const keystore = new Keystore('/data/unprotected.keystore');
      keystore.remove('a1.b2.c3');

      expect(keystore.data).toEqual({
        a2: 'bar',
      });
    });
  });

  describe('encrypt', () => {
    it('has randomness ', () => {
      const text = 'foo';
      const password = 'changeme';

      const dataOne = Keystore.encrypt(text, password);
      const dataTwo = Keystore.encrypt(text, password);

      expect(dataOne).not.toEqual(dataTwo);
    });

    it('can immediately be decrypted', () => {
      const password = 'changeme';
      const secretText = 'foo';

      const data = Keystore.encrypt(secretText, password);
      const text = Keystore.decrypt(data, password);

      expect(text).toEqual(secretText);
    });
  });

  describe('decrypt', () => {
    const text = 'foo';
    const password = 'changeme';
    const ciphertext =
      'ctvRsD0l0u958QoPuINQX+wgspbXt2+7IJ7gNbCND2dCGZxYOCwMH9' +
      'MEdZZG4cevSrnhYOaxh24POFhtisSdCSlLWsKNQU8NK1zqNQ3RRP8HxayZJB7ly9uOLbDS+' +
      'Ew=';

    it('can decrypt data', () => {
      const data = Keystore.decrypt(ciphertext, password);
      expect(data).toEqual(text);
    });

    it('throws error for invalid password', () => {
      expect.assertions(1);
      try {
        Keystore.decrypt(ciphertext, 'invalid');
      } catch (e) {
        expect(e).toBeInstanceOf(Keystore.errors.UnableToReadKeystore);
      }
    });

    it('throws error for corrupt ciphertext', () => {
      expect.assertions(1);
      try {
        Keystore.decrypt('thisisinvalid', password);
      } catch (e) {
        expect(e).toBeInstanceOf(Keystore.errors.UnableToReadKeystore);
      }
    });
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });
});
