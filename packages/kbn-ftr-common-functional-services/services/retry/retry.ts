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

export class RetryService extends FtrService {
  private readonly config = this.ctx.getService('config');
  private readonly log = this.ctx.getService('log');

  public async tryForTime<T>(
    timeout: number,
    block: () => Promise<T>,
    onFailureBlock?: () => Promise<T>
  ) {
    return await retryForSuccess(this.log, {
      timeout,
      methodName: 'retry.tryForTime',
      block,
      onFailureBlock,
    });
  }

  public async try<T>(block: () => Promise<T>, onFailureBlock?: () => Promise<T>) {
    return await retryForSuccess(this.log, {
      timeout: this.config.get('timeouts.try'),
      methodName: 'retry.try',
      block,
      onFailureBlock,
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
}
