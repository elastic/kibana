import sinon from 'sinon';
import mockFs from 'mock-fs';

import { Keystore } from '../server/keystore';
import { list } from './list';
import Logger from '../cli_plugin/lib/logger';

describe('Kibana keystore', () => {
  describe('list', () => {
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

      sinon.assert.calledOnce(Logger.prototype.error);
      sinon.assert.calledWith(Logger.prototype.error, 'ERROR: Kibana keystore not found. Use \'create\' command to create one.');
    });
  });
});
