/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BaseObject, type ObjectScope } from '@elastic/eui-test-helpers';
import type { Locator } from '@playwright/test';

/**
 * Playwright Component Object for
 * {@link https://eui.elastic.co/docs/components/forms/selection/selectable/ EuiSelectable}.
 *
 * Prototype for `@elastic/eui-test-helpers` (see the package CONTRIBUTING guide);
 * lives in kbn-scout until it is ported and published.
 *
 * `testSubj` must be set on the `EuiSelectable` (EUI spreads it onto the
 * `.euiSelectable` root). When the selectable renders in a popover the consumer
 * opens, pass that popover/panel as `scope` and drive the open/close from the
 * page object — the popover is not this component's concern.
 */
export class EuiSelectableObject extends BaseObject {
  constructor(scope: ObjectScope, testSubj: string) {
    super(scope, testSubj, '.euiSelectable');
  }

  /**
   * The options currently mounted in the list, as a `Locator` so callers keep
   * Playwright auto-retry for count and content assertions
   * (e.g. `expect(options).toHaveCount(3)`). The list is virtualized, so this is
   * the rendered window — `search()` first to filter the target into view
   * rather than scanning a long list.
   */
  public get options(): Locator {
    return this.root.getByRole('option');
  }

  /**
   * Selects the option with the given label. A no-op if it is already selected
   * (checked, or the sole active option in a single-selection list).
   *
   * Matches on the option's label element (`.euiSelectableListItem__text`), not
   * its accessible name. `append`/`prepend` badges render in a sibling element,
   * so they are excluded. EUI appends screen-reader state text inside the label
   * element (a checked option reads `"<label> . Checked option."`), which always
   * starts with a `.`, so the match allows an optional `.`-prefixed suffix. That
   * boundary is what keeps `selectOption('New York')` from also matching
   * `New York City`: a real longer label continues with a word, not a `.`.
   *
   * This is for lists in their default state. Once you call `search()`, EUI
   * wraps the matched text in `<mark>` and injects highlight markers, so a label
   * match no longer resolves. On a searched list, select via the option's own
   * `data-test-subj`, or drive it through {@link options} directly.
   *
   * Only matches the plain label. A consumer using a custom `renderOption` to
   * add its own content (e.g. a description) inside the option renders that
   * content in the same label element, which breaks the anchored match. Select
   * those options via {@link options} instead (e.g.
   * `options.filter({ hasText: label })`).
   */
  async selectOption(label: string): Promise<void> {
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const labelText = new RegExp(`^${escaped}(\\s*\\..*)?$`);
    const option = this.root.getByRole('option').filter({
      has: this.root.page().locator('.euiSelectableListItem__text', { hasText: labelText }),
    });
    if ((await option.getAttribute('aria-checked')) === 'true') {
      return;
    }
    await option.click();
  }

  /**
   * Type into the selectable's search box to filter the options. Throws if the
   * selectable is not searchable (no search box rendered).
   */
  async search(term: string): Promise<void> {
    // `fill()` auto-waits for the search box; if the selectable is not
    // searchable it surfaces a clear locator-timeout on its own.
    await this.root.locator('.euiSelectableSearch').fill(term);
  }
}
