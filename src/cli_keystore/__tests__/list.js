import sinon from 'sinon';
import mockFs from 'mock-fs';

import { Keystore } from '../../server/keystore';
import { list } from '../list';
import Logger from '../../cli_plugin/lib/logger';

describe('Kibana keystore', () => {
  describe('list', () => {
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

      sandbox.stub(Logger.prototype, 'log');
      sandbox.stub(Logger.prototype, 'error');
    });

    afterEach(() => {
      mockFs.restore();
      sandbox.restore();
    });

    it('outputs keys', () => {
      const keystore = new Keystore('/data/test.keystore');
      list(keystore);

      sinon.assert.calledOnce(Logger.prototype.log);
      sinon.assert.calledWith(Logger.prototype.log, 'a1.b2.c3\na2');
    });

    it('handles a nonexistent keystore', () => {
      const keystore = new Keystore('/data/nonexistent.keystore');
      list(keystore);

      sinon.assert.calledOnce(Logger.prototype.log);
      sinon.assert.calledWith(Logger.prototype.log, '');
    });
  });
});
