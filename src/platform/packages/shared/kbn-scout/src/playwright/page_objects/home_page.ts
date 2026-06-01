/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ScoutPage } from '..';

export class HomePage {
  constructor(private readonly page: ScoutPage) {}

  public get homeApp() {
    return this.page.testSubj.locator('homeApp');
  }

  public get manageSection() {
    return this.page.testSubj.locator('homeDataManage');
  }

  public get stackManagementButton() {
    return this.page.testSubj.locator('homeManage');
  }

  public async goto() {
    await this.page.addInitScript(() => {
      window.localStorage.setItem('home:welcome:show', 'false');
    });
    await this.page.gotoApp('home');
    await this.homeApp.waitFor({ state: 'visible' });
  }

  // The home page renders one solution card per registered solution, with
  // `data-test-subj="homeSolutionPanel homeSolutionPanel_${solution.id}"`.
  // Match on the second token via an attribute-contains-word selector so
  // unrelated future test-subj strings starting with `homeSolutionPanel`
  // (e.g. a panel header) cannot leak into the result.
  public async getVisibleSolutions(): Promise<string[]> {
    const locator = this.page.locator('[data-test-subj~="homeSolutionPanel"]');
    const attributes = await locator.evaluateAll((nodes) =>
      nodes.map((node) => node.getAttribute('data-test-subj') ?? '')
    );
    return attributes
      .flatMap((value) => value.split(' '))
      .filter((token) => token.startsWith('homeSolutionPanel_'))
      .map((token) => token.slice('homeSolutionPanel_'.length));
  }
}
