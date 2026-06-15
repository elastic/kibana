/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Locator, ScoutPage } from '@kbn/scout';

export class DevToolsPage {
  public readonly lastBreadcrumb: Locator;
  public readonly readOnlyBadge: Locator;

  constructor(private readonly page: ScoutPage) {
    this.lastBreadcrumb = this.page.testSubj.locator('breadcrumb last');
    this.readOnlyBadge = this.page.testSubj.locator('headerBadge');
  }

  async goto(hash: string) {
    await this.page.gotoApp('dev_tools', { hash });
  }

  appContainer(readySubject: string) {
    return this.page.testSubj.locator(readySubject);
  }
}
