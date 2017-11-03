import expect from 'expect.js';
import sinon from 'sinon';
import mockFs from 'mock-fs';

import { Keystore } from '../../server/keystore';
import { remove } from '../remove';

describe('Kibana keystore', () => {
  describe('remove', () => {
    const sandbox = sinon.sandbox.create();

    const keystoreData = {
      version: 1,
      ciphertext: 'cf360ea4c88ce1eebec4e5a03cf5e514b006d8abc52aee058d8213765c',
      tag: '746d6042037a5d5c8550a3a70886de0c'
    };

    beforeEach(() => {
      mockFs({
        '/data': {
          'test.keystore': JSON.stringify(keystoreData),
        }
      });
    });

    afterEach(() => {
      mockFs.restore();
      sandbox.restore();
    });

    it('removes key', () => {
      const keystore = new Keystore('/data/test.keystore');

      remove(keystore, 'a2');

      expect(keystore.data).to.eql({ 'a1.b2.c3': 'foo' });
    });

    it('persists the keystore', () => {
      const keystore = new Keystore('/data/test.keystore');
      sandbox.stub(keystore, 'save');

      remove(keystore, 'a2');

      sinon.assert.calledOnce(keystore.save);
    });
  });
});
