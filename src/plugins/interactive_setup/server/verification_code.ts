/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import chalk from 'chalk';
import crypto from 'crypto';

import type { Logger } from 'src/core/server';

export class VerificationCode {
  public readonly code = VerificationCode.generate();
  private failedAttempts = 0;
  private readonly maxFailedAttempts = 10;

  constructor(private readonly logger: Logger) {}

  public get remainingAttempts() {
    return this.maxFailedAttempts - this.failedAttempts;
  }

  public verify(code: string | undefined) {
    if (this.failedAttempts >= this.maxFailedAttempts) {
      this.logger.error('Maximum number of attempts exceeded. Restart Kibana to retry.');
      return false;
    }

    const formattedCode = chalk.black.bgCyanBright(
      ` ${this.code.substr(0, 3)} ${this.code.substr(3)} `
    );

    if (code === undefined) {
      this.logger.info(`Your verification code is: ${formattedCode}`);
      return false;
    }

    if (code !== this.code) {
      this.failedAttempts++;
      this.logger.error(
        `Invalid verification code '${code}' provided. ${this.remainingAttempts} attempts left. Your verification code is: ${formattedCode}`
      );
      return false;
    }

    this.logger.info('Code verified successfully');

    this.failedAttempts = 0;
    return true;
  }

  private static generate(length = 6) {
    return Math.floor(secureRandomNumber() * Math.pow(10, length)).toString();
  }
}

function secureRandomNumber() {
  return crypto.randomBytes(4).readUInt32LE() / 0x100000000;
}
