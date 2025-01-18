/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const mockKeystoreWithoutPassword =
  '1:20nsJf6P1Koi1x2kwrOhc4la7bqisOqJFlb5XpI95Qc/4sJjCHxoRzO1iGiBuoAtqolCHxRs976t59uFXQXtTv9zY5PoUvGyoPOxbA4q/H7n+EygneCbSc18MGHXA5K0NZm8RBhjWaKphe4=';
const mockKeystoreWithPassword =
  '1:j/zZA0L6cPonF6zacVTOT0qwZeXgPJOZrLHhFYg+CzchCIcjjhH/70JyHj7gPCEa/ZrBm8gCAKbcXSo8eQsHP25Qf922f/tXI9m6IiXPf6G/v/KiO0rOSjobDNFYWCxCD7aIJmYnuoPMhqc=';

jest.mock('fs', () => ({
  readFileSync: jest.fn().mockImplementation((path) => {
    if (path.includes('with_password.keystore')) {
      return JSON.stringify(mockKeystoreWithPassword);
    }
    if (path.includes('without_password.keystore')) {
      return JSON.stringify(mockKeystoreWithoutPassword);
    }

    throw { code: 'ENOENT' };
  }),
  existsSync: jest.fn().mockImplementation(() => true),
  writeFileSync: jest.fn(),
}));

import sinon from 'sinon';

import { Keystore } from '../cli/keystore';
import { hasPasswd } from './has_passwd';
import { Logger } from '../cli/logger';

describe('Kibana keystore', () => {
  describe('has_passwd', () => {
    const sandbox = sinon.createSandbox();

    beforeEach(() => {
      sandbox.stub(Logger.prototype, 'log');
      sandbox.stub(Logger.prototype, 'error');
    });

    afterEach(() => {
      sandbox.restore();
    });
    it('exits 0 if password protected', async () => {
      const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {});
      const keystore = new Keystore('with_password.keystore');
      hasPasswd(keystore);

      expect(mockExit).toHaveBeenCalledWith(0);
      sinon.assert.calledWith(Logger.prototype.log, 'Keystore is password-protected');
    });

    it('exits 1 if not password protected', async () => {
      const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {});
      const keystore = new Keystore('without_password.keystore');
      hasPasswd(keystore);

      expect(mockExit).toHaveBeenCalledWith(1);
      sinon.assert.calledWith(Logger.prototype.error, 'Error: Keystore is not password protected');
    });
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });
});
