/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BaseObject, type ObjectScope } from '@elastic/eui-test-helpers';
import { expect, type Locator } from '@playwright/test';

/**
 * Playwright Component Object for
 * {@link https://eui.elastic.co/docs/components/display/toast/ EuiGlobalToastList}.
 *
 * Prototype for `@elastic/eui-test-helpers` (see the package CONTRIBUTING guide);
 * lives in kbn-scout until it is ported and published.
 *
 * In Kibana the global toast list already carries the `globalToastList`
 * test subj (the factory default), so no product changes are needed. Toasts
 * rendered outside the global list (inline `EuiToast`) are not covered.
 */
export class EuiGlobalToastListObject extends BaseObject {
  constructor(scope: ObjectScope, testSubj: string = 'globalToastList') {
    super(scope, testSubj, '.euiGlobalToastList');
  }

  /**
   * The toasts currently in the list. Exposed as a `Locator` so callers keep
   * Playwright auto-retry for count and content assertions
   * (e.g. `expect(toasts).toHaveCount(1)`).
   */
  public get toasts(): Locator {
    return this.root.locator('.euiToast');
  }

  /**
   * Closes every toast in the list and waits until none remain. No-op when the
   * list is empty (dismissing "if present" is a common teardown need).
   */
  async closeAll(): Promise<void> {
    for (const closeButton of await this.root.getByTestId('toastCloseButton').all()) {
      // A toast may auto-dismiss while iterating; ignore clicks that miss.
      await closeButton.click({ timeout: 5_000 }).catch(() => {});
    }
    await expect(this.toasts).toHaveCount(0);
  }
}
