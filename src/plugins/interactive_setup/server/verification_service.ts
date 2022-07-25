/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import fs from 'fs';
import path from 'path';

import type { Logger } from '@kbn/core/server';
import { getDataPath } from '@kbn/utils';

import { getDetailedErrorMessage } from './errors';
import { VerificationCode } from './verification_code';

export class VerificationService {
  private fileName: string;

  constructor(private readonly logger: Logger) {
    this.fileName = path.join(getDataPath(), 'verification_code');
  }

  public setup() {
    const verificationCode = new VerificationCode(this.logger);

    try {
      fs.writeFileSync(this.fileName, verificationCode.code);
      this.logger.debug(`Successfully wrote verification code to ${this.fileName}`);
      return verificationCode;
    } catch (error) {
      this.logger.error(
        `Failed to write verification code to ${this.fileName}: ${getDetailedErrorMessage(error)}.`
      );
    }
  }

  public stop() {
    try {
      fs.unlinkSync(this.fileName);
      this.logger.debug(`Successfully removed ${this.fileName}`);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        this.logger.error(`Failed to remove ${this.fileName}: ${getDetailedErrorMessage(error)}.`);
      }
    }
  }
}
