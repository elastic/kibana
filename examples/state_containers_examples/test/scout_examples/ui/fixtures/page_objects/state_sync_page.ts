/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Locator, ScoutPage } from '@kbn/scout';

export class StateSyncPage {
  readonly allFilterLink: Locator;
  readonly completedFilterLink: Locator;
  readonly notCompletedFilterLink: Locator;
  readonly todoCheckbox: Locator;

  constructor(private readonly page: ScoutPage) {
    this.allFilterLink = this.page.testSubj.locator('filterLinkAll');
    this.completedFilterLink = this.page.testSubj.locator('filterLinkCompleted');
    this.notCompletedFilterLink = this.page.testSubj.locator('filterLinkNotCompleted');
    this.todoCheckbox = this.page.testSubj.locator('todoCheckbox-0');
  }

  async goto(appId: string, title: string): Promise<void> {
    await this.page.gotoApp(appId, {
      readyWhen: this.page.getByRole('heading', { name: title, exact: true }),
    });
  }

  async completeTodo(): Promise<void> {
    await this.todoCheckbox.check();
  }

  async showNotCompletedTodos(): Promise<void> {
    await this.notCompletedFilterLink.click();
  }
}
