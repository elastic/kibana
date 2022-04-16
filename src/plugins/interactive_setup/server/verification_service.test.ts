/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import fs from 'fs';

import { loggingSystemMock } from '@kbn/core/server/mocks';

import { VerificationCode } from './verification_code';
import { VerificationService } from './verification_service';

jest.mock('fs');
jest.mock('@kbn/utils', () => ({
  getDataPath: jest.fn().mockReturnValue('/data/'),
}));

const loggerMock = loggingSystemMock.createLogger();

describe('VerificationService', () => {
  describe('setup()', () => {
    it('should generate verification code', () => {
      const service = new VerificationService(loggerMock);
      const setup = service.setup();
      expect(setup).toBeInstanceOf(VerificationCode);
    });

    it('should write verification code to disk', () => {
      const service = new VerificationService(loggerMock);
      const setup = service.setup()!;
      expect(fs.writeFileSync).toHaveBeenCalledWith('/data/verification_code', setup.code);
    });

    it('should not return verification code if cannot write to disk', () => {
      const service = new VerificationService(loggerMock);
      (fs.writeFileSync as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Write error');
      });
      const setup = service.setup();
      expect(fs.writeFileSync).toHaveBeenCalledWith('/data/verification_code', expect.anything());
      expect(setup).toBeUndefined();
    });
  });

  describe('stop()', () => {
    it('should remove verification code from disk', () => {
      const service = new VerificationService(loggerMock);
      service.stop();
      expect(fs.unlinkSync).toHaveBeenCalledWith('/data/verification_code');
    });
  });
});
