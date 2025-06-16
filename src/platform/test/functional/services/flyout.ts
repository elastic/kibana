/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { FtrService } from '../ftr_provider_context';

export class FlyoutService extends FtrService {
  private readonly testSubjects = this.ctx.getService('testSubjects');
  private readonly find = this.ctx.getService('find');
  private readonly log = this.ctx.getService('log');
  private readonly retry = this.ctx.getService('retry');

  public async close(dataTestSubj: string): Promise<void> {
    this.log.debug('Closing flyout', dataTestSubj);
    const flyoutElement = await this.testSubjects.find(dataTestSubj);
    await this.retry.try(async () => {
      const closeBtn = await flyoutElement.findByCssSelector('[aria-label*="Close"]');
      await closeBtn.click();
      await this.testSubjects.missingOrFail(dataTestSubj);
    });
  }

  public async ensureClosed(dataTestSubj: string): Promise<void> {
    if (await this.testSubjects.exists(dataTestSubj, { timeout: 1000 })) {
      await this.close(dataTestSubj);
    }
  }

  public async ensureAllClosed(): Promise<void> {
    await this.retry.waitFor('all flyouts to be closed', async () => {
      let flyoutElements = await this.find.allByCssSelector('.euiFlyout', 2500);
      if (!flyoutElements.length) {
        return true;
      }
      let expectedFlyoutCount = 0;
      for (let i = 0; i < flyoutElements.length; i++) {
        const closeBtnExists = await this.find.descendantExistsByCssSelector(
          '[aria-label*="Close"]',
          flyoutElements[i]
        );
        if (closeBtnExists) {
          const closeBtn = await flyoutElements[i].findByCssSelector('[aria-label*="Close"]');
          await closeBtn.click();
        } else {
          // If it doesn't have a close button, it can't
          // be closed, so ignore it in the count check
          expectedFlyoutCount++;
        }
      }
      flyoutElements = await this.find.allByCssSelector('.euiFlyout', 500);
      return flyoutElements.length === expectedFlyoutCount;
    });
  }
}
