/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import fs from 'fs';

import { loggingSystemMock } from 'src/core/server/mocks';

import { VerificationCode } from './verification_code';
import { VerificationService } from './verification_service';

jest.mock('fs');

const loggerMock = loggingSystemMock.createLogger();

describe('VerificationService', () => {
  describe('setup()', () => {
    it('should generate verification code', () => {
      const service = new VerificationService('/path/to/kibana.yml', loggerMock);
      const setup = service.setup();
      expect(setup).toBeInstanceOf(VerificationCode);
    });

    it('should write verification code to disk', () => {
      const service = new VerificationService('/path/to/kibana.yml', loggerMock);
      const setup = service.setup();
      expect(fs.writeFileSync).toHaveBeenCalledWith('/path/to/.code', setup.code);
    });
  });

  describe('stop()', () => {
    it('should remove verification code from disk', () => {
      const service = new VerificationService('/path/to/kibana.yml', loggerMock);
      service.stop();
      expect(fs.unlinkSync).toHaveBeenCalledWith('/path/to/.code');
    });
  });
});
