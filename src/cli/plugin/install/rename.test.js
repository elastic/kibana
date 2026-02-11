/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import fs from 'fs';

import sinon from 'sinon';

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
        code: 'error',
      });
    });

    return renamePlugin('/foo/bar', '/bar/foo').catch(function (err) {
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
        throw new Error("We shouldn't have any errors");
      });
  });

  describe('Windows', function () {
    let platform;
    beforeEach(function () {
      platform = Object.getOwnPropertyDescriptor(process, 'platform');
      Object.defineProperty(process, 'platform', {
        value: 'win32',
      });
    });
    afterEach(function () {
      Object.defineProperty(process, 'platform', platform);
    });

    it('should retry on Windows EPERM errors for up to 3 seconds', function () {
      renameStub = sinon.stub(fs, 'rename').callsFake((from, to, cb) => {
        cb({
          code: 'EPERM',
        });
      });
      return renamePlugin('/foo/bar', '/bar/foo').catch(function (err) {
        expect(err.code).toBe('EPERM');
        expect(renameStub.callCount).toBeGreaterThan(1);
      });
    }, 5000);
  });
});
