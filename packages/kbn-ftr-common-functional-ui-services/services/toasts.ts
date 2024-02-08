/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import { FtrService } from './ftr_provider_context';
import { WebElementWrapper } from './web_element_wrapper';

export class ToastsService extends FtrService {
  private readonly testSubjects = this.ctx.getService('testSubjects');
  private readonly retry = this.ctx.getService('retry');
  private readonly find = this.ctx.getService('find');
  private readonly config = this.ctx.getService('config');
  private readonly log = this.ctx.getService('log');
  private readonly defaultFindTimeout = this.config.get('timeouts.find');
  /**
   * Returns the title and message of a specific error toast.
   * This method is specific to toasts created via `.addError` since they contain
   * an additional button, that should not be part of the message.
   *
   * @param index The index of the toast (1-based, NOT 0-based!) of the toast. Use first by default.
   * @param titleOnly If this is true, only the title of the error message is returned. There are error messages that only contain a title, no message.
   * @returns The title and message of the specified error toast.https://github.com/elastic/kibana/issues/17087
   */
  public async getErrorToast(index: number = 1, titleOnly: boolean = false) {
    const toast = await this.getToastElementByIndex(index);
    const titleElement = await this.testSubjects.findDescendant('euiToastHeader', toast);
    const title: string = await titleElement.getVisibleText();
    if (titleOnly) {
      return { title };
    }
    const messageElement = await this.testSubjects.findDescendant('errorToastMessage', toast);
    const message: string = await messageElement.getVisibleText();
    return { title, message };
  }

  public async toastMessageByTestSubj(testSubj = 'csp:toast-success') {
    const testSubjSvc = this.testSubjects;
    return {
      async getElement(): Promise<WebElementWrapper> {
        return await testSubjSvc.find(testSubj);
      },
      async clickToastMessageLink(linkTestSubj = 'csp:toast-success-link') {
        const element = await this.getElement();
        const link = await element.findByTestSubject(linkTestSubj);
        await link.click();
      },
    };
  }

  /**
   * Dismiss a specific toast from the toast list. Since toasts usually should time out themselves,
   * you only need to call this for permanent toasts (e.g. error toasts).
   *
   * @param index The 1-based index of the toast to dismiss. Use first by default.
   */
  public async dismissToastByIndex(index: number = 1): Promise<void> {
    const toast = await this.getToastElementByIndex(index);
    await toast.moveMouseTo();
    const dismissButton = await this.testSubjects.findDescendant('toastCloseButton', toast);
    await dismissButton.click();
  }

  public async closeToastIfExists(): Promise<void> {
    const toastShown = await this.find.existsByCssSelector('.euiToast');
    if (toastShown) {
      try {
        await this.testSubjects.click('toastCloseButton');
      } catch (err) {
        // ignore errors, toast clear themselves after timeout
      }
    }
  }

  public async closeToast(): Promise<string> {
    const toast = await this.find.byCssSelector('.euiToast', 6 * this.defaultFindTimeout);
    await toast.moveMouseTo();
    const title = await (await this.testSubjects.find('euiToastHeader__title')).getVisibleText();

    await this.testSubjects.click('toastCloseButton');
    return title;
  }

  public async dismissAllToasts(): Promise<void> {
    const xs = await this.getAllToastElements();
    this.log.debug(`\nλjs toasts: \n${JSON.stringify(xs, null, 2)}`);
    this.log.debug(`\nλjs toasts.length: \n  ${xs.length}`);

    if (xs.length === 0) return;

    for (const toastElement of xs) {
      try {
        await toastElement.moveMouseTo();
        const closeBtn = await toastElement.findByTestSubject('toastCloseButton');
        await closeBtn.click();
      } catch (err) {
        // ignore errors, toast clear themselves after timeout
      }
    }
  }

  public async dismissAllToastsWithChecks(): Promise<void> {
    await this.retry.tryForTime(30 * 1000, async (): Promise<void> => {
      await this.dismissAllToasts();
      await this.assertToastCount(0);
    });
  }

  public async assertToastCount(expectedCount: number): Promise<void> {
    await this.retry.tryForTime(5 * 1000, async (): Promise<void> => {
      const toastCount = await this.getToastCount({ timeout: 1000 });
      expect(toastCount).to.eql(
        expectedCount,
        `Toast count should be ${expectedCount} (got ${toastCount})`
      );
    });
  }

  public async getToastElementByIndex(index: number): Promise<WebElementWrapper> {
    return await (
      await this.getGlobalToastList()
    ).findByCssSelector(`.euiToast:nth-child(${index})`);
  }

  public async getToastTitleByIndex(index: number): Promise<string> {
    const resultToast = await this.getToastElementByIndex(index);
    const titleElement = await this.testSubjects.findDescendant('euiToastHeader', resultToast);
    const title: string = await titleElement.getVisibleText();
    return title;
  }

  public async getToastContentByIndex(index: number): Promise<string> {
    const elem = await this.getToastElementByIndex(index);
    return await elem.getVisibleText();
  }

  public async getAllToastElements() {
    const list = await this.getGlobalToastList();
    return await list.findAllByCssSelector(`.euiToast`);
  }

  private async getGlobalToastList(options?: { timeout?: number }): Promise<WebElementWrapper> {
    return await this.testSubjects.find('globalToastList', options?.timeout);
  }

  public async getToastCount(options?: { timeout?: number }): Promise<number> {
    const list = await this.getGlobalToastList(options);
    const toasts = await list.findAllByCssSelector(`.euiToast`, options?.timeout);
    return toasts.length;
  }
}
