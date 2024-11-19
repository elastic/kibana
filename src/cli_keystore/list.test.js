/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
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
import { Keystore } from '../cli/keystore';
import { list } from './list';
import { Logger } from '../cli/logger';

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

    it('outputs keys', async () => {
      const keystore = new Keystore('/data/test.keystore');
      await list(keystore);

      sinon.assert.calledOnce(Logger.prototype.log);
      sinon.assert.calledWith(Logger.prototype.log, 'a1.b2.c3\na2');
    });

    it('handles a nonexistent keystore', async () => {
      const keystore = new Keystore('/data/nonexistent.keystore');
      await list(keystore);

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
