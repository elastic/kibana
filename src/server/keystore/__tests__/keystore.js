import expect from 'expect.js';
import mockFs from 'mock-fs';
import sinon from 'sinon';
import { readFileSync } from 'fs';

import { Keystore } from '../keystore';

describe('Keystore', () => {
  const sandbox = sinon.sandbox.create();

  const protoctedKeystoreData = {
    version: 1,
    ciphertext: 'f2df8454c218de9a20bad0f7d2050a8832cd3a0b19b22d6099956bff41',
    tag: '53c04cb53dde233af4a9100294d855e4'
  };

  const unprotectedKeystoreData = {
    version: 1,
    ciphertext: 'cf360ea4c88ce1eebec4e5a03cf5e514b006d8abc52aee058d8213765c',
    tag: '746d6042037a5d5c8550a3a70886de0c'
  };

  beforeEach(() => {
    mockFs({
      '/data': {
        'protected.keystore': JSON.stringify(protoctedKeystoreData),
        'unprotected.keystore': JSON.stringify(unprotectedKeystoreData),
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

    it('creates keystore', () => {
      const path = '/data/test.keystore';

      const keystore = new Keystore(path, 'changeme');
      keystore.save();

      const fileBuffer = readFileSync(path);
      const data = JSON.parse(fileBuffer.toString());

      expect(data).to.only.have.keys(['version', 'ciphertext', 'tag']);
      expect(data.version).to.be(1);
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
    const text = 'foo';
    const ciphertext = '5317de';
    const tag = 'b2ff8c731cd2b026ad0a96ee8b34244e';
    const password = 'mypassword';

    it('provides symmetric encryption', () => {
      const data = Keystore.encrypt(text, password);

      expect(data).to.eql({
        ciphertext,
        tag
      });
    });
  });

  describe('decrypt', () => {
    const text = 'foo';
    const ciphertext = '5317de';
    const tag = 'b2ff8c731cd2b026ad0a96ee8b34244e';
    const password = 'mypassword';

    it('can decrypt data', () => {
      const data = Keystore.decrypt(ciphertext, tag, password);
      expect(data).to.eql(text);
    });

    it('throws error for invalid password', () => {
      try {
        Keystore.decrypt(ciphertext, tag, 'invalid');
        expect().fail('should throw error');
      } catch(e) {
        expect(e).to.be.a(Keystore.errors.UnableToReadKeystore);
      }
    });

    it('throws error for invalid tag', () => {
      try {
        Keystore.decrypt(ciphertext, 'invalid', password);
        expect().fail('should throw error');
      } catch(e) {
        expect(e).to.be.a(Keystore.errors.UnableToReadKeystore);
      }
    });

    it('throws error for missing tag', () => {
      try {
        Keystore.decrypt(ciphertext, null, password);
        expect().fail('should throw error');
      } catch(e) {
        expect(e).to.be.a(Keystore.errors.UnableToReadKeystore);
      }
    });
  });
});
