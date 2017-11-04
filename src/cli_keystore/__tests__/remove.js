import expect from 'expect.js';
import sinon from 'sinon';
import mockFs from 'mock-fs';

import { Keystore } from '../../server/keystore';
import { remove } from '../remove';

describe('Kibana keystore', () => {
  describe('remove', () => {
    const sandbox = sinon.sandbox.create();

    const keystoreData = 'vlXZaImfDAKf2ZvBRCKrr7u6/MYjuREUGho0/usYajyhmbQY63S9'
          + '9pjzJ9eA+IRmE2wj3Prd0LV3Z5ed144LnNIPc0I3RPNDVyxvZdQgkfe8HIFhIu7RA'
          + 'PsAmPzYyHGWdQtcREAlg3bxxjz85QX4p3SnCx8MXETcDQ==:1';

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
