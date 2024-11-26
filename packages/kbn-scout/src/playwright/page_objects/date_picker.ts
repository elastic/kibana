/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ScoutPage } from '../fixtures/types';
import { expect } from '..';

export class DatePicker {
  constructor(private readonly page: ScoutPage) {}

  async setAbsoluteRange({ from, to }: { from: string; to: string }) {
    await this.page.testSubj.click('superDatePickerShowDatesButton');
    // we start with end date
    await this.page.testSubj.click('superDatePickerendDatePopoverButton');
    await this.page.testSubj.click('superDatePickerAbsoluteTab');
    const inputFrom = this.page.testSubj.locator('superDatePickerAbsoluteDateInput');
    await inputFrom.clear();
    await inputFrom.fill(to);
    await this.page.testSubj.click('parseAbsoluteDateFormat');
    await this.page.testSubj.click('superDatePickerendDatePopoverButton');
    // and later change start date
    await this.page.testSubj.click('superDatePickerstartDatePopoverButton');
    await this.page.testSubj.click('superDatePickerAbsoluteTab');
    const inputTo = this.page.testSubj.locator('superDatePickerAbsoluteDateInput');
    await inputTo.clear();
    await inputTo.fill(from);
    await this.page.testSubj.click('parseAbsoluteDateFormat');
    await this.page.keyboard.press('Escape');

    await expect(this.page.testSubj.locator('superDatePickerstartDatePopoverButton')).toHaveText(
      from
    );
    await expect(this.page.testSubj.locator('superDatePickerendDatePopoverButton')).toHaveText(to);
    await this.page.testSubj.click('querySubmitButton');
  }
}
