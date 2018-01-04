import expect from 'expect.js';
import mockFs from 'mock-fs';
import sinon from 'sinon';
import { readFileSync } from 'fs';

import { Keystore } from '../keystore';

describe('Keystore', () => {
  const sandbox = sinon.sandbox.create();

  const protoctedKeystoreData = '1:4BnWfydL8NwFIQJg+VQKe0jlIs7uXtty6+++yaWPbSB'
    + 'KIX3d9nPfQ20K1C6Xh26E/gMJAQ9jh7BxK0+W3lt/iDJBJn44wqX3pQ0189iGkNBL0ibDCc'
    + 'tz4mRy6+hqwiLxiukpH8ELAJsff8LNNHr+gNzX/2k/GvB7nQ==';

  const unprotectedKeystoreData = '1:IxR0geiUTMJp8ueHDkqeUJ0I9eEw4NJPXIJi22UDy'
    + 'fGfJSy4mHBBuGPkkAix/x/YFfIxo4tiKGdJ2oVTtU8LgKDkVoGdL+z7ylY4n3myatt6osqh'
    + 'I4lzJ9MRy21UcAJki2qFUTj4TYuvhta3LId+RM5UX/dJ2468hQ==';

  beforeEach(() => {
    mockFs({
      '/data': {
        'protected.keystore': protoctedKeystoreData,
        'unprotected.keystore': unprotectedKeystoreData,
      },
      '/inaccessible': mockFs.directory({
        mode: '0000',
      })
    });
  });

  afterEach(() => {
    mockFs.restore();
    sandbox.restore();
  });

  describe('save', () => {
    it('thows permission denied', () => {
      const path = '/inaccessible/test.keystore';

      try {
        const keystore = new Keystore(path);
        keystore.save();

        expect().fail('should throw error');
      } catch(e) {
        expect(e.code).to.eql('EACCES');
      }
    });

    it('creates keystore with version', () => {
      const path = '/data/test.keystore';

      const keystore = new Keystore(path);
      keystore.save();

      const fileBuffer = readFileSync(path);
      const contents = fileBuffer.toString();
      const [version, data] = contents.split(':');

      expect(version).to.eql(1);
      expect(data.length).to.be.greaterThan(100);
    });
  });

  describe('load', () => {
    it('is called on initialization', () => {
      const load = sandbox.spy(Keystore.prototype, 'load');

      new Keystore('/data/protected.keystore', 'changeme');

      expect(load.calledOnce).to.be(true);
    });

    it('can load a password protected keystore', () => {
      const keystore = new Keystore('/data/protected.keystore', 'changeme');
      expect(keystore.data).to.eql({ 'a1.b2.c3': 'foo', 'a2': 'bar' });
    });

    it('throws unable to read keystore', () => {
      try {
        new Keystore('/data/protected.keystore', 'wrongpassword');

        expect().fail('should throw error');
      } catch(e) {
        expect(e).to.be.a(Keystore.errors.UnableToReadKeystore);
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
      expect(keystore.data).to.eql([]);
    });
  });

  describe('keys', () => {
    it('lists object keys', () => {
      const keystore = new Keystore('/data/unprotected.keystore');
      const keys = keystore.keys();

      expect(keys).to.eql(['a1.b2.c3', 'a2']);
    });
  });

  describe('has', () => {
    it('returns true if key exists', () => {
      const keystore = new Keystore('/data/unprotected.keystore');

      expect(keystore.has('a2')).to.be(true);
    });

    it('returns false if key does not exist', () => {
      const keystore = new Keystore('/data/unprotected.keystore');

      expect(keystore.has('invalid')).to.be(false);
    });
  });

  describe('add', () => {
    it('adds a key/value pair', () => {
      const keystore = new Keystore('/data/unprotected.keystore');
      keystore.add('a3', 'baz');

      expect(keystore.data).to.eql({
        'a1.b2.c3': 'foo',
        'a2': 'bar',
        'a3': 'baz',
      });
    });
  });

  describe('remove', () => {
    it('removes a key/value pair', () => {
      const keystore = new Keystore('/data/unprotected.keystore');
      keystore.remove('a1.b2.c3');

      expect(keystore.data).to.eql({
        'a2': 'bar',
      });
    });
  });

  describe('encrypt', () => {
    it('has randomness ', () => {
      const text = 'foo';
      const password = 'changeme';

      const dataOne = Keystore.encrypt(text, password);
      const dataTwo = Keystore.encrypt(text, password);

      expect(dataOne).to.not.eql(dataTwo);
    });

    it('can immediately be decrypted', () => {
      const password = 'changeme';
      const secretText = 'foo';

      const data = Keystore.encrypt(secretText, password);
      const text = Keystore.decrypt(data, password);

      expect(text).to.eql(secretText);
    });
  });

  describe('decrypt', () => {
    const text = 'foo';
    const password = 'changeme';
    const ciphertext = 'ctvRsD0l0u958QoPuINQX+wgspbXt2+7IJ7gNbCND2dCGZxYOCwMH9'
    + 'MEdZZG4cevSrnhYOaxh24POFhtisSdCSlLWsKNQU8NK1zqNQ3RRP8HxayZJB7ly9uOLbDS+'
    + 'Ew=';

    it('can decrypt data', () => {
      const data = Keystore.decrypt(ciphertext, password);
      expect(data).to.eql(text);
    });

    it('throws error for invalid password', () => {
      try {
        Keystore.decrypt(ciphertext, 'invalid');
        expect().fail('should throw error');
      } catch(e) {
        expect(e).to.be.a(Keystore.errors.UnableToReadKeystore);
      }
    });

    it('throws error for corrupt ciphertext', () => {
      try {
        Keystore.decrypt('thisisinvalid', password);
        expect().fail('should throw error');
      } catch(e) {
        expect(e).to.be.a(Keystore.errors.UnableToReadKeystore);
      }
    });
  });
});
