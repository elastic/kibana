import expect from 'expect.js';
import sinon from 'sinon';
import mockFs from 'mock-fs';
import inquirer from 'inquirer';

import { Keystore } from '../../server/keystore';
import { create } from '../create';
import Logger from '../../cli_plugin/lib/logger';

describe('Kibana keystore', () => {
  describe('create', () => {
    const sandbox = sinon.sandbox.create();

    const keystoreData = {
      version: 1,
      ciphertext: 'cf360ea4c88ce1eebec4e5a03cf5e514b006d8abc52aee058d8213765c',
      tag: '746d6042037a5d5c8550a3a70886de0c'
    };

    beforeEach(() => {
      mockFs({
        '/tmp': {
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
      const keystore = new Keystore('/tmp/foo.keystore');
      sandbox.stub(keystore, 'save');

      await create(keystore);

      sinon.assert.calledOnce(keystore.save);
    });

    it('logs successful keystore creating', async () => {
      const path = '/tmp/foo.keystore';
      const keystore = new Keystore(path);

      await create(keystore);

      sinon.assert.calledOnce(Logger.prototype.log);
      sinon.assert.calledWith(Logger.prototype.log, `Created Kibana keystore in ${path}`);
    });

    it('prompts for overwrite', async () => {
      sandbox.stub(inquirer, 'prompt').returns(Promise.resolve(
        { overwrite: true })
      );

      const keystore = new Keystore('/tmp/test.keystore');
      await create(keystore);

      sinon.assert.calledOnce(inquirer.prompt);
      const args = inquirer.prompt.getCall(0).args[0][0];

      expect(args.message).to.eql('A Kibana keystore already exists. Overwrite?');
      expect(args.default).to.be(false);
    });

    it('aborts if overwrite is denied', async () => {
      sandbox.stub(inquirer, 'prompt').returns(Promise.resolve(
        { overwrite: false })
      );

      const keystore = new Keystore('/tmp/test.keystore');
      sandbox.stub(keystore, 'save');

      await create(keystore);

      sinon.assert.calledOnce(Logger.prototype.log);
      sinon.assert.calledWith(Logger.prototype.log, 'Exiting without modifying keystore.');

      sinon.assert.notCalled(keystore.save);
    });
  });
});
