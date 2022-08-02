/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';

import { VERIFICATION_CODE_LENGTH } from '../common';
import { VerificationCode } from './verification_code';

const loggerMock = loggingSystemMock.createLogger();

describe('VerificationCode', () => {
  it('should generate a 6 digit code', () => {
    for (let i = 0; i < 10; i++) {
      const { code } = new VerificationCode(loggerMock);
      expect(code).toHaveLength(VERIFICATION_CODE_LENGTH);
      expect(code).toEqual(expect.stringMatching(/^[0-9]+$/));
    }
  });

  it('should verify code correctly', () => {
    const verificationCode = new VerificationCode(loggerMock);

    expect(verificationCode.verify(undefined)).toBe(false);
    expect(verificationCode.verify('')).toBe(false);
    expect(verificationCode.verify('invalid')).toBe(false);
    expect(verificationCode.verify(verificationCode.code)).toBe(true);
  });

  it('should track number of failed attempts', () => {
    const verificationCode = new VerificationCode(loggerMock);

    verificationCode.verify('invalid');
    verificationCode.verify('invalid');
    verificationCode.verify('invalid');
    expect(verificationCode['failedAttempts']).toBe(3); // eslint-disable-line dot-notation
  });

  it('should reset number of failed attempts if valid code is entered', () => {
    const verificationCode = new VerificationCode(loggerMock);

    verificationCode.verify('invalid');
    verificationCode.verify('invalid');
    verificationCode.verify('invalid');
    expect(verificationCode.verify(verificationCode.code)).toBe(true);
    expect(verificationCode['failedAttempts']).toBe(0); // eslint-disable-line dot-notation
  });

  it('should permanently fail once maximum number of failed attempts has been reached', () => {
    const verificationCode = new VerificationCode(loggerMock);

    // eslint-disable-next-line dot-notation
    for (let i = 0; i < verificationCode['maxFailedAttempts']; i++) {
      verificationCode.verify('invalid');
    }
    expect(verificationCode.verify(verificationCode.code)).toBe(false);
  });

  it('should ignore empty calls in number of failed attempts', () => {
    const verificationCode = new VerificationCode(loggerMock);

    verificationCode.verify(undefined);
    verificationCode.verify(undefined);
    verificationCode.verify(undefined);
    expect(verificationCode['failedAttempts']).toBe(0); // eslint-disable-line dot-notation
  });
});
