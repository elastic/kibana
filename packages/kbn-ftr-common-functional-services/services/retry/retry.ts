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

interface TryWithRetriesOptions {
  retryCount: number;
  retryDelay?: number;
  timeout?: number;
}

export class RetryService extends FtrService {
  private readonly config = this.ctx.getService('config');
  private readonly log = this.ctx.getService('log');

  /**
   * Use to retry block within {timeout} period and return block result.
   * @param timeout retrying timeout
   * @param block retriable action
   * @param onFailureBlock optional action to run before the new retriable action attempt
   * @param retryDelay optional delay before the new attempt
   * @returns result from retriable action
   */
  public async tryForTime<T>(
    timeout: number,
    block: () => Promise<T>,
    onFailureBlock?: () => Promise<T>,
    retryDelay?: number
  ) {
    return await retryForSuccess<T>(this.log, {
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

  /**
   * Use to wait for block condition to be true
   * @param description description for retriable action
   * @param timeout retrying timeout
   * @param block retriable action
   * @param onFailureBlock optional action to run before the new retriable action attempt
   */
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

  /**
   * Use to retry block {options.retryCount} times within {options.timeout} period and return block result
   * @param description description for retriable action
   * @param block retriable action
   * @param options options.retryCount for how many attempts to retry
   * @param onFailureBlock optional action to run before the new retriable action attempt
   * @returns result from retriable action
   */
  public async tryWithRetries<T>(
    description: string,
    block: () => Promise<T>,
    options: TryWithRetriesOptions,
    onFailureBlock?: () => Promise<T>
  ): Promise<T> {
    const { retryCount, timeout = this.config.get('timeouts.try'), retryDelay = 200 } = options;

    return await retryForSuccess<T>(this.log, {
      description,
      timeout,
      methodName: 'retry.tryWithRetries',
      block,
      onFailureBlock,
      retryDelay,
      retryCount,
    });
  }
}
