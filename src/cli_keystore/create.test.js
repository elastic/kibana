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
  readFileSync: jest.fn().mockImplementation(path => {
    if (!path.includes('foo')) {
      return JSON.stringify(mockKeystoreData);
    }

    throw { code: 'ENOENT' };
  }),
  existsSync: jest.fn().mockImplementation(path => {
    return !path.includes('foo');
  }),
  writeFileSync: jest.fn(),
}));

import sinon from 'sinon';

import { Keystore } from '../legacy/server/keystore';
import { create } from './create';
import Logger from '../cli_plugin/lib/logger';
import * as prompt from '../legacy/server/utils/prompt';

describe('Kibana keystore', () => {
  describe('create', () => {
    const sandbox = sinon.createSandbox();

    beforeEach(() => {
      sandbox.stub(Logger.prototype, 'log');
      sandbox.stub(Logger.prototype, 'error');
    });

    afterEach(() => {
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

      expect(args[0]).toEqual('A Kibana keystore already exists. Overwrite?');
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

  afterAll(() => {
    jest.restoreAllMocks();
  });
});
