/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const mockKeystoreData =
  '1:IxR0geiUTMJp8ueHDkqeUJ0I9eEw4NJPXIJi22UDyfGfJSy4mH' +
  'BBuGPkkAix/x/YFfIxo4tiKGdJ2oVTtU8LgKDkVoGdL+z7ylY4n3myatt6osqhI4lzJ9M' +
  'Ry21UcAJki2qFUTj4TYuvhta3LId+RM5UX/dJ2468hQ==';

jest.mock('fs', () => ({
  readFileSync: jest.fn().mockImplementation((path) => {
    if (!path.includes('foo')) {
      return JSON.stringify(mockKeystoreData);
    }

    throw { code: 'ENOENT' };
  }),
  existsSync: jest.fn().mockImplementation((path) => {
    return !path.includes('foo');
  }),
  writeFileSync: jest.fn(),
}));

import sinon from 'sinon';

import { Keystore } from '../cli/keystore';
import { create } from './create';
import { Logger } from '../cli/logger';
import * as prompt from './utils/prompt';

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
