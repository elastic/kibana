/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import chalk from 'chalk';
import crypto from 'crypto';

import type { Logger } from '@kbn/core/server';
import { unsafeConsole } from '@kbn/security-hardening';

import { VERIFICATION_CODE_LENGTH } from '../common';

export class VerificationCode {
  public readonly code = VerificationCode.generate(VERIFICATION_CODE_LENGTH);
  private failedAttempts = 0;
  private readonly maxFailedAttempts = 5;

  constructor(private readonly logger: Logger) {}

  public get remainingAttempts() {
    return this.maxFailedAttempts - this.failedAttempts;
  }

  public verify(code: string | undefined) {
    if (this.failedAttempts >= this.maxFailedAttempts) {
      this.logger.error(
        'Maximum number of attempts exceeded. Restart Kibana to generate a new code and retry.'
      );
      return false;
    }

    const highlightedCode = chalk.black.bgCyanBright(
      ` ${this.code.substr(0, 3)} ${this.code.substr(3)} `
    );

    if (code === undefined) {
      // eslint-disable-next-line @kbn/eslint/no_unsafe_console
      unsafeConsole.log(`

Your verification code is: ${highlightedCode}

`);
      return false;
    }

    if (code !== this.code) {
      this.failedAttempts++;
      this.logger.error(
        `Invalid verification code '${code}' provided. ${this.remainingAttempts} attempts left.`
      );
      // eslint-disable-next-line @kbn/eslint/no_unsafe_console
      unsafeConsole.log(`

Your verification code is: ${highlightedCode}

`);
      return false;
    }

    this.logger.debug(`Code '${code}' verified successfully`);

    this.failedAttempts = 0;
    return true;
  }

  /**
   * Returns a cryptographically secure and random 6-digit code.
   */
  private static generate(length: number) {
    return secureRandomNumber(length).join('');
  }
}

/**
 * Cryptographically secure equivalent of `Math.random()`.
 */
function secureRandomNumber(length: number) {
  const digits = [];
  while (digits.length < length) {
    const byte = crypto.randomBytes(1)[0];
    if (byte >= 250) {
      continue;
    }
    digits.push(byte % 10);
  }

  return digits;
}
