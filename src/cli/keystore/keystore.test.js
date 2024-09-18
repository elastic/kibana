/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
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
  readFileSync: jest.fn().mockImplementation((path) => {
    if (path.includes('data/unprotected')) {
      return JSON.stringify(mockUnprotectedKeystoreData);
    }

    if (path.includes('data/protected')) {
      return JSON.stringify(mockProtectedKeystoreData);
    }

    if (path.includes('keystore_correct_password_file')) {
      return 'changeme';
    }

    if (path.includes('keystore_incorrect_password_file')) {
      return 'wrongpassword';
    }

    if (path.includes('data/test') || path.includes('data/nonexistent')) {
      throw { code: 'ENOENT' };
    }

    throw { code: 'EACCES' };
  }),
  existsSync: jest.fn().mockImplementation((path) => {
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
    it('thows permission denied', async () => {
      expect.assertions(1);
      const path = '/inaccessible/test.keystore';

      try {
        const keystore = await Keystore.initialize(path);
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
    const env = process.env;

    beforeEach(() => {
      jest.resetModules();
      process.env = { ...env };
    });

    afterAll(() => {
      process.env = env;
    });

    it('is called on initialization', async () => {
      const load = sandbox.spy(Keystore.prototype, 'load');

      await Keystore.initialize('/data/protected.keystore', 'changeme');

      expect(load.calledOnce).toBe(true);
    });

    it('can load a password protected keystore', async () => {
      const keystore = await Keystore.initialize('/data/protected.keystore', 'changeme');
      expect(keystore.data).toEqual({ 'a1.b2.c3': 'foo', a2: 'bar' });
    });

    it('can load a valid password protected keystore from env KEYSTORE_PASSWORD', async () => {
      process.env.KEYSTORE_PASSWORD = 'changeme';
      const keystore = await Keystore.initialize('/data/protected.keystore');
      expect(keystore.data).toEqual({ 'a1.b2.c3': 'foo', a2: 'bar' });
    });

    it('can not load a password protected keystore from env KEYSTORE_PASSWORD with the wrong password', async () => {
      process.env.KEYSTORE_PASSWORD = 'wrongpassword';
      expect.assertions(1);
      try {
        await Keystore.initialize('/data/protected.keystore');
      } catch (e) {
        expect(e).toBeInstanceOf(Keystore.errors.UnableToReadKeystore);
      }
    });

    it('can load a password protected keystore from env KBN_KEYSTORE_PASSPHRASE_FILE', async () => {
      process.env.KBN_KEYSTORE_PASSPHRASE_FILE = 'keystore_correct_password_file';
      const keystore = await Keystore.initialize('/data/protected.keystore');
      expect(keystore.data).toEqual({ 'a1.b2.c3': 'foo', a2: 'bar' });
    });

    it('can not load a password protected keystore from env KBN_KEYSTORE_PASSPHRASE_FILE with the wrong password', async () => {
      process.env.KBN_KEYSTORE_PASSPHRASE_FILE = 'keystore_incorrect_password_file';
      expect.assertions(1);
      try {
        await Keystore.initialize('/data/protected.keystore');
      } catch (e) {
        expect(e).toBeInstanceOf(Keystore.errors.UnableToReadKeystore);
      }
    });

    it('throws unable to read keystore', async () => {
      expect.assertions(1);
      try {
        await Keystore.initialize('/data/protected.keystore', 'wrongpassword');
      } catch (e) {
        expect(e).toBeInstanceOf(Keystore.errors.UnableToReadKeystore);
      }
    });

    it('gracefully handles keystore not found', () => {
      new Keystore('/data/nonexistent.keystore');
    });
  });

  describe('reset', () => {
    it('clears the data', async () => {
      const keystore = await Keystore.initialize('/data/protected.keystore', 'changeme');
      keystore.reset();
      expect(keystore.data).toEqual({});
    });
  });

  describe('keys', () => {
    it('lists object keys', async () => {
      const keystore = await Keystore.initialize('/data/unprotected.keystore');
      const keys = keystore.keys();

      expect(keys).toEqual(['a1.b2.c3', 'a2']);
    });
  });

  describe('has', () => {
    it('returns true if key exists', async () => {
      const keystore = await Keystore.initialize('/data/unprotected.keystore');

      expect(keystore.has('a2')).toBe(true);
    });

    it('returns false if key does not exist', async () => {
      const keystore = await Keystore.initialize('/data/unprotected.keystore');

      expect(keystore.has('invalid')).toBe(false);
    });
  });

  describe('add', () => {
    it('adds a key/value pair', async () => {
      const keystore = await Keystore.initialize('/data/unprotected.keystore');
      keystore.add('a3', 'baz');
      keystore.add('a4', [1, 'a', 2, 'b']);

      expect(keystore.data).toEqual({
        'a1.b2.c3': 'foo',
        a2: 'bar',
        a3: 'baz',
        a4: [1, 'a', 2, 'b'],
      });
    });
  });

  describe('remove', () => {
    it('removes a key/value pair', async () => {
      const keystore = await Keystore.initialize('/data/unprotected.keystore');
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
