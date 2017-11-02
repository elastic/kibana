import sinon from 'sinon';
import mockFs from 'mock-fs';

import { Keystore } from '../../server/keystore';
import { list } from '../list';
import Logger from '../../cli_plugin/lib/logger';

describe('Kibana keystore', () => {
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

  describe('list', () => {
    it('outputs keys', () => {
      const keystore = new Keystore('/tmp/test.keystore');
      list(keystore);

      sinon.assert.calledOnce(Logger.prototype.log);
      sinon.assert.calledWith(Logger.prototype.log, 'a1.b2.c3\na2');
    });

    it('handles a nonexistent keystore', () => {
      const keystore = new Keystore('/tmp/nonexistent.keystore');
      list(keystore);

      sinon.assert.calledOnce(Logger.prototype.log);
      sinon.assert.calledWith(Logger.prototype.log, '');
    });
  });
});
