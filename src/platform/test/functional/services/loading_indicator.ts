/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { FtrService } from '../ftr_provider_context';

const LOADING_INDICATOR_IDLE_TIME_MS = 1000;
const LOADING_INDICATOR_VISIBILITY_CHECK_MS = 100;

export class LoadingIndicatorService extends FtrService {
  private readonly config = this.ctx.getService('config');
  private readonly log = this.ctx.getService('log');
  private readonly retry = this.ctx.getService('retry');
  private readonly testSubjects = this.ctx.getService('testSubjects');

  private readonly defaultFindTimeout = this.config.get('timeouts.find');

  public async waitUntilLoadingHasFinished(): Promise<void> {
    try {
      await this.isGlobalLoadingIndicatorVisible();
    } catch (exception) {
      if (exception instanceof Error && exception.name === 'ElementNotVisible') {
        // selenium might just have been too slow to catch it
      } else {
        throw exception;
      }
    }
    await this.awaitGlobalLoadingIndicatorHidden();
  }

  public async isGlobalLoadingIndicatorVisible(): Promise<boolean> {
    this.log.debug('isGlobalLoadingIndicatorVisible');
    return await this.isLoadingIndicatorVisible(1500);
  }

  public async awaitGlobalLoadingIndicatorHidden(): Promise<void> {
    let hiddenSince: number | undefined;

    await this.retry.tryForTime(
      this.defaultFindTimeout * 10,
      async () => {
        try {
          await this.assertLoadingIndicatorHidden();
        } catch (exception) {
          hiddenSince = undefined;
          throw exception;
        }

        hiddenSince ??= Date.now();
        if (Date.now() - hiddenSince < LOADING_INDICATOR_IDLE_TIME_MS) {
          throw new Error('global loading indicator has not remained hidden long enough');
        }
      },
      undefined,
      LOADING_INDICATOR_VISIBILITY_CHECK_MS
    );
  }

  private async assertLoadingIndicatorHidden(): Promise<void> {
    await this.testSubjects.existOrFail('globalLoadingIndicator-hidden', {
      allowHidden: true,
      timeout: LOADING_INDICATOR_VISIBILITY_CHECK_MS,
    });

    if (await this.isLoadingIndicatorVisible(LOADING_INDICATOR_VISIBILITY_CHECK_MS)) {
      throw new Error('global loading indicator is still visible');
    }
  }

  private async isLoadingIndicatorVisible(timeout: number): Promise<boolean> {
    return await this.testSubjects.exists('globalLoadingIndicator', { timeout });
  }
}
