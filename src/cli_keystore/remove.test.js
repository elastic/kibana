import sinon from 'sinon';
import mockFs from 'mock-fs';

import { Keystore } from '../server/keystore';
import { remove } from './remove';

describe('Kibana keystore', () => {
  describe('remove', () => {
    const sandbox = sinon.sandbox.create();

    const keystoreData = '1:IxR0geiUTMJp8ueHDkqeUJ0I9eEw4NJPXIJi22UDyfGfJSy4mH'
      + 'BBuGPkkAix/x/YFfIxo4tiKGdJ2oVTtU8LgKDkVoGdL+z7ylY4n3myatt6osqhI4lzJ9M'
      + 'Ry21UcAJki2qFUTj4TYuvhta3LId+RM5UX/dJ2468hQ==';

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

      expect(keystore.data).toEqual({ 'a1.b2.c3': 'foo' });
    });

    it('persists the keystore', () => {
      const keystore = new Keystore('/data/test.keystore');
      sandbox.stub(keystore, 'save');

      remove(keystore, 'a2');

      sinon.assert.calledOnce(keystore.save);
    });
  });
});
