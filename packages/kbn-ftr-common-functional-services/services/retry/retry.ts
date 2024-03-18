/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { FtrService } from '../ftr_provider_context';
import { retryForSuccess } from './retry_for_success';
import { retryForTruthy } from './retry_for_truthy';

/**
 * retr
 */
interface TryWithAttemptsOptions {
  retries?: number;
  timeout?: number;
  retryDelay?: number;
}

export class RetryService extends FtrService {
  private readonly config = this.ctx.getService('config');
  private readonly log = this.ctx.getService('log');

  public async tryForTime<T>(
    timeout: number,
    block: () => Promise<T>,
    onFailureBlock?: () => Promise<T>,
    retryDelay?: number
  ) {
    return await retryForSuccess(this.log, {
      timeout,
      methodName: 'retry.tryForTime',
      block,
      onFailureBlock,
      retryDelay,
    });
  }

  public async try<T>(
    block: () => Promise<T>,
    onFailureBlock?: () => Promise<T>,
    retryDelay?: number
  ) {
    return await retryForSuccess(this.log, {
      timeout: this.config.get('timeouts.try'),
      methodName: 'retry.try',
      block,
      onFailureBlock,
      retryDelay,
    });
  }

  public async waitForWithTimeout(
    description: string,
    timeout: number,
    block: () => Promise<boolean>,
    onFailureBlock?: () => Promise<any>
  ) {
    await retryForTruthy(this.log, {
      timeout,
      methodName: 'retry.waitForWithTimeout',
      description,
      block,
      onFailureBlock,
    });
  }

  public async waitFor(
    description: string,
    block: () => Promise<boolean>,
    onFailureBlock?: () => Promise<any>
  ) {
    await retryForTruthy(this.log, {
      timeout: this.config.get('timeouts.waitFor'),
      methodName: 'retry.waitFor',
      description,
      block,
      onFailureBlock,
    });
  }

  public async tryWithRetries<T>(
    description: string,
    block: () => Promise<T>,
    options: TryWithAttemptsOptions = {}
  ): Promise<T> {
    const {
      retries = 2,
      timeout = this.config.get('timeouts.waitFor'),
      retryDelay = 200,
    } = options;
    let retryAttempt = 0;
    const result = await this.tryForTime(
      timeout,
      async () => {
        if (retryAttempt > retries) {
          // Log error message if we reached the maximum number of retries
          // but don't throw an error, return it to break the retry loop.
          const errorMessage = `Reached maximum number of retries: ${retryAttempt - 1}/${retries}`;
          this.log.error(errorMessage);
          return new Error(JSON.stringify(errorMessage));
        }

        retryAttempt = retryAttempt + 1;

        // Catch the error thrown by the test and log it, throw it again to force `tryForTime` to retry.
        try {
          return await block();
        } catch (error) {
          this.log.error(`Retrying ${description}: ${error}`);
          throw error;
        }
      },
      undefined,
      retryDelay
    );

    if (result instanceof Error) {
      throw result;
    }

    return result;
  }
}
