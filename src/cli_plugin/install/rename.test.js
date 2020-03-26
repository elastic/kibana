/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import sinon from 'sinon';
import fs from 'fs';

import { renamePlugin } from './rename';

describe('plugin folder rename', function() {
  let renameStub;

  beforeEach(function() {
    renameStub = sinon.stub();
  });

  afterEach(function() {
    fs.rename.restore();
  });

  it('should rethrow any exceptions', function() {
    renameStub = sinon.stub(fs, 'rename').callsFake((from, to, cb) => {
      cb({
        code: 'error',
      });
    });

    return renamePlugin('/foo/bar', '/bar/foo').catch(function(err) {
      expect(err.code).toBe('error');
      expect(renameStub.callCount).toBe(1);
    });
  });

  it('should resolve if there are no errors', function() {
    renameStub = sinon.stub(fs, 'rename').callsFake((from, to, cb) => {
      cb();
    });

    return renamePlugin('/foo/bar', '/bar/foo')
      .then(function() {
        expect(renameStub.callCount).toBe(1);
      })
      .catch(function() {
        throw new Error("We shouldn't have any errors");
      });
  });

  describe('Windows', function() {
    let platform;
    beforeEach(function() {
      platform = Object.getOwnPropertyDescriptor(process, 'platform');
      Object.defineProperty(process, 'platform', {
        value: 'win32',
      });
    });
    afterEach(function() {
      Object.defineProperty(process, 'platform', platform);
    });

    it('should retry on Windows EPERM errors for up to 3 seconds', function() {
      renameStub = sinon.stub(fs, 'rename').callsFake((from, to, cb) => {
        cb({
          code: 'EPERM',
        });
      });
      return renamePlugin('/foo/bar', '/bar/foo').catch(function(err) {
        expect(err.code).toBe('EPERM');
        expect(renameStub.callCount).toBeGreaterThan(1);
      });
    }, 5000);
  });
});
