import expect from 'expect.js';
import sinon from 'sinon';
import mockFs from 'mock-fs';

import { Keystore } from '../../server/keystore';
import { create } from '../create';
import Logger from '../../cli_plugin/lib/logger';
import * as prompt from '../../utils/prompt';

describe('Kibana keystore', () => {
  describe('create', () => {
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

    it('creates keystore file', async () => {
      const keystore = new Keystore('/data/foo.keystore');
      sandbox.stub(keystore, 'save');

      await create(keystore);

      sinon.assert.calledOnce(keystore.save);
    });

    it('logs successful keystore creating', async () => {
      const path = '/data/foo.keystore';
      const keystore = new Keystore(path);

      await create(keystore);

      sinon.assert.calledOnce(Logger.prototype.log);
      sinon.assert.calledWith(Logger.prototype.log, `Created Kibana keystore in ${path}`);
    });

    it('prompts for overwrite', async () => {
      sandbox.stub(prompt, 'confirm').returns(Promise.resolve(true));

      const keystore = new Keystore('/data/test.keystore');
      await create(keystore);

      sinon.assert.calledOnce(prompt.confirm);
      const { args } = prompt.confirm.getCall(0);

      expect(args[0]).to.eql('A Kibana keystore already exists. Overwrite?');
    });

    it('aborts if overwrite is denied', async () => {
      sandbox.stub(prompt, 'confirm').returns(Promise.resolve(false));

      const keystore = new Keystore('/data/test.keystore');
      sandbox.stub(keystore, 'save');

      await create(keystore);

      sinon.assert.calledOnce(Logger.prototype.log);
      sinon.assert.calledWith(Logger.prototype.log, 'Exiting without modifying keystore.');

      sinon.assert.notCalled(keystore.save);
    });
  });
});
