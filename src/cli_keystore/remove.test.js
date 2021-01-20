/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

const mockKeystoreData =
  '1:IxR0geiUTMJp8ueHDkqeUJ0I9eEw4NJPXIJi22UDyfGfJSy4mH' +
  'BBuGPkkAix/x/YFfIxo4tiKGdJ2oVTtU8LgKDkVoGdL+z7ylY4n3myatt6osqhI4lzJ9M' +
  'Ry21UcAJki2qFUTj4TYuvhta3LId+RM5UX/dJ2468hQ==';

jest.mock('fs', () => ({
  readFileSync: jest.fn().mockImplementation(() => JSON.stringify(mockKeystoreData)),
  existsSync: jest.fn().mockImplementation(() => true),
  writeFileSync: jest.fn(),
}));

import sinon from 'sinon';

import { Keystore } from '../cli/keystore';
import { remove } from './remove';

describe('Kibana keystore', () => {
  describe('remove', () => {
    const sandbox = sinon.createSandbox();

    afterEach(() => {
      sandbox.restore();
    });

    it('removes key', () => {
      const keystore = new Keystore('/data/test.keystore');

      remove(keystore, 'a2');

      expect(keystore.data).toEqual({ 'a1.b2.c3': 'foo' });
    });

    it('persists the keystore', () => {
      const keystore = new Keystore('/data/test.keystore');
      sandbox.stub(keystore, 'save');

      remove(keystore, 'a2');

      sinon.assert.calledOnce(keystore.save);
    });
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });
});
