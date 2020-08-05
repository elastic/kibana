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

const mockKeystoreData =
  '1:IxR0geiUTMJp8ueHDkqeUJ0I9eEw4NJPXIJi22UDyfGfJSy4mH' +
  'BBuGPkkAix/x/YFfIxo4tiKGdJ2oVTtU8LgKDkVoGdL+z7ylY4n3myatt6osqhI4lzJ9M' +
  'Ry21UcAJki2qFUTj4TYuvhta3LId+RM5UX/dJ2468hQ==';

jest.mock('fs', () => ({
  readFileSync: jest.fn().mockImplementation((path) => {
    if (!path.includes('nonexistent')) {
      return JSON.stringify(mockKeystoreData);
    }

    throw { code: 'ENOENT' };
  }),
  existsSync: jest.fn().mockImplementation((path) => {
    return !path.includes('nonexistent');
  }),
}));

import sinon from 'sinon';
import { Keystore } from '../legacy/server/keystore';
import { list } from './list';
import Logger from '../cli_plugin/lib/logger';

describe('Kibana keystore', () => {
  describe('list', () => {
    const sandbox = sinon.createSandbox();

    beforeEach(() => {
      sandbox.stub(Logger.prototype, 'log');
      sandbox.stub(Logger.prototype, 'error');
    });

    afterEach(() => {
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
      sinon.assert.calledWith(
        Logger.prototype.error,
        "ERROR: Kibana keystore not found. Use 'create' command to create one."
      );
    });
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });
});
