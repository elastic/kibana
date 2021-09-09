/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import fs from 'fs';
import path from 'path';

import type { Logger } from 'src/core/server';

import { getDetailedErrorMessage } from './errors';
import { VerificationCode } from './verification_code';

export class VerificationService {
  private fname: string;

  constructor(configPath: string, private readonly logger: Logger) {
    this.fname = path.join(path.dirname(configPath), '.code');
  }

  public setup() {
    const verificationCode = new VerificationCode(this.logger);

    try {
      fs.writeFileSync(this.fname, verificationCode.code);
      this.logger.debug(`Successfully wrote verification code to ${this.fname}`);
    } catch (error) {
      this.logger.error(
        `Failed to write verification code to ${this.fname}: ${getDetailedErrorMessage(error)}.`
      );
    }

    return verificationCode;
  }

  public stop() {
    try {
      fs.unlinkSync(this.fname);
      this.logger.debug(`Successfully removed ${this.fname}`);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        this.logger.error(`Failed to remove ${this.fname}: ${getDetailedErrorMessage(error)}.`);
      }
    }
  }
}
