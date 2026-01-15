/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ScoutPage } from '..';
import { expect } from '..';

export class HomeApp {
  constructor(private readonly page: ScoutPage) {}

  async gotoSampleDataTab() {
    await this.page.gotoApp('home', { hash: '/tutorial_directory/sampleData' });
    await this.page.testSubj.waitForSelector('showSampleDataButton', { state: 'visible' });
  }

  async openSampleDataAccordion() {
    const accordionButton = this.page.testSubj.locator('showSampleDataButton');
    const isOpen = (await accordionButton.getAttribute('aria-expanded')) === 'true';
    if (!isOpen) {
      await accordionButton.click();
      await this.page.waitForFunction(
        (element) => element.getAttribute('aria-expanded') === 'true',
        await accordionButton.elementHandle()
      );
    }
  }

  private getSampleDataCard(id: string) {
    return this.page.testSubj.locator(`sampleDataSetCard${id}`);
  }

  async addSampleDataSet(id: string) {
    await this.openSampleDataAccordion();
    const addButton = this.page.testSubj.locator(`addSampleDataSet${id}`);
    await addButton.scrollIntoViewIfNeeded();

    await expect
      .poll(
        async () => {
          if (await this.isSampleDataInstalled(id)) {
            return true;
          }
          return addButton.isEnabled();
        },
        { timeout: 30_000 }
      )
      .toBe(true);

    if (!(await this.isSampleDataInstalled(id))) {
      await addButton.click();
    }

    await expect.poll(() => this.isSampleDataInstalled(id), { timeout: 60_000 }).toBe(true);
  }

  async removeSampleDataSet(id: string) {
    await this.openSampleDataAccordion();
    const removeButton = this.page.testSubj.locator(`removeSampleDataSet${id}`);
    await removeButton.scrollIntoViewIfNeeded();

    await expect
      .poll(
        async () => {
          if (!(await this.isSampleDataInstalled(id))) {
            return true;
          }
          return removeButton.isEnabled();
        },
        { timeout: 30_000 }
      )
      .toBe(true);

    if (await this.isSampleDataInstalled(id)) {
      await removeButton.click();
    }

    await expect
      .poll(async () => !(await this.isSampleDataInstalled(id)), { timeout: 60_000 })
      .toBe(true);
  }

  async isSampleDataInstalled(id: string) {
    await this.openSampleDataAccordion();
    const sampleDataCard = this.getSampleDataCard(id);
    if ((await sampleDataCard.count()) === 0) {
      return false;
    }
    const status = await sampleDataCard.locator('[data-status]').getAttribute('data-status');
    const removeButton = sampleDataCard.locator(`[data-test-subj="removeSampleDataSet${id}"]`);
    return status === 'installed' && (await removeButton.count()) > 0;
  }
}
