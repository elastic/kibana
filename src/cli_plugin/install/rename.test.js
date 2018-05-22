import sinon from 'sinon';
import fs from 'fs';

import { renamePlugin } from './rename';

describe('plugin folder rename', function () {
  let renameStub;

  beforeEach(function () {
    renameStub = sinon.stub();
  });

  afterEach(function () {
    fs.rename.restore();
  });

  it('should rethrow any exceptions', function () {
    renameStub = sinon.stub(fs, 'rename').callsFake((from, to, cb) => {
      cb({
        code: 'error'
      });
    });

    return renamePlugin('/foo/bar', '/bar/foo')
      .catch(function (err) {
        expect(err.code).toBe('error');
        expect(renameStub.callCount).toBe(1);
      });
  });

  it('should resolve if there are no errors', function () {
    renameStub = sinon.stub(fs, 'rename').callsFake((from, to, cb) => {
      cb();
    });

    return renamePlugin('/foo/bar', '/bar/foo')
      .then(function () {
        expect(renameStub.callCount).toBe(1);
      })
      .catch(function () {
        throw new Error('We shouln\'t have any errors');
      });
  });

  describe('Windows', function () {
    let platform;
    beforeEach(function () {
      platform = Object.getOwnPropertyDescriptor(process, 'platform');
      Object.defineProperty(process, 'platform', {
        value: 'win32'
      });
    });
    afterEach(function () {
      Object.defineProperty(process, 'platform', platform);
    });

    it('should retry on Windows EPERM errors for up to 3 seconds', function () {
      renameStub = sinon.stub(fs, 'rename').callsFake((from, to, cb) => {
        cb({
          code: 'EPERM'
        });
      });
      return renamePlugin('/foo/bar', '/bar/foo')
        .catch(function (err) {
          expect(err.code).toBe('EPERM');
          expect(renameStub.callCount).toBeGreaterThan(1);
        });
    }, 5000);
  });
});
