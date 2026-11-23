/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { FtrService } from '../ftr_provider_context';
import { retryForSuccess } from './retry_for_success';
import { retryForTruthy } from './retry_for_truthy';

export interface RetryOptions {
  description?: string;
  // The initial delay before the first attempt
  initialDelay?: number;
  // The delay between retry attempts
  retryDelay?: number;
  // The timeout for the retry attempts
  timeout?: number;
}

interface RetryOptionsWithRecovery<T> extends RetryOptions {
  onFailureBlock?: () => Promise<T>;
}

const getRetryOptions = <T>(
  optionsOrOnFailureBlock?: RetryOptionsWithRecovery<T> | (() => Promise<T>),
  retryDelay?: number
): RetryOptionsWithRecovery<T> =>
  typeof optionsOrOnFailureBlock === 'function'
    ? { onFailureBlock: optionsOrOnFailureBlock, retryDelay }
    : { retryDelay, ...optionsOrOnFailureBlock };

export class RetryService extends FtrService {
  private readonly config = this.ctx.getService('config');
  private readonly log = this.ctx.getService('log');

  /** Retry the block until it succeeds or the supplied timeout expires. */
  public async tryForTime<T>(
    timeout: number,
    block: () => Promise<T>,
    optionsOrOnFailureBlock?: Omit<RetryOptionsWithRecovery<T>, 'timeout'> | (() => Promise<T>),
    retryDelay?: number
  ): Promise<T> {
    return await retryForSuccess<T>(this.log, {
      ...getRetryOptions(optionsOrOnFailureBlock, retryDelay),
      timeout,
      methodName: 'retry.tryForTime',
      block,
    });
  }

  public async try<T>(
    block: () => Promise<T>,
    optionsOrOnFailureBlock?: RetryOptionsWithRecovery<T> | (() => Promise<T>),
    retryDelay?: number
  ): Promise<T> {
    const { timeout = this.config.get('timeouts.try'), ...options } = getRetryOptions(
      optionsOrOnFailureBlock,
      retryDelay
    );
    return await retryForSuccess(this.log, {
      ...options,
      timeout,
      methodName: 'retry.try',
      block,
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
}
