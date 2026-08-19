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
 * {@link https://eui.elastic.co/docs/components/tabular-content/tables/ EuiBasicTable}
 * (also covers `EuiInMemoryTable`, which renders a `EuiBasicTable` underneath and
 * passes the `data-test-subj` straight through).
 *
 * Prototype for `@elastic/eui-test-helpers` (see the package CONTRIBUTING guide);
 * lives in kbn-scout until it is ported and published.
 *
 * Deliberately minimal: only `rows` and `cells(field)` are exposed. Row actions
 * (consumer-supplied popovers/buttons), sorting, and pagination are not covered —
 * no current consumer needs them, and the first two are largely app-specific
 * wiring rather than EUI-internal DOM knowledge. Add methods here only once a
 * real migration needs them.
 */
export class EuiBasicTableObject extends BaseObject {
  constructor(scope: ObjectScope, testSubj: string) {
    super(scope, testSubj, '.euiBasicTable');
  }

  /**
   * The table's data rows, as a `Locator` so callers keep Playwright auto-retry
   * for count and content assertions (e.g. `expect(table.rows).toHaveCount(3)`).
   *
   * Excludes EUI's own "no items found" row: when the table is empty, EUI still
   * renders a single `.euiTableRow` whose one cell spans every column
   * (`colSpan` on `EuiTableRowCell`, the `td[colspan]` HTML attribute). Real data
   * rows don't set `colspan` on their cells, so filtering it out is what keeps
   * `toHaveCount(0)` correct on an empty table instead of reading `1`.
   */
  public get rows(): Locator {
    return this.root
      .locator('.euiTableRow')
      .filter({ hasNot: this.root.page().locator('td[colspan]') });
  }

  /**
   * The cells of the given field-data column, one per row, as a `Locator` for
   * retrying content/count assertions (e.g.
   * `expect(await table.cells('status')).toHaveText(['Running'])`).
   *
   * Resolves the column's position from EUI's own header cell
   * (`tableHeaderCell_<field>_<index>`) via its native `cellIndex`, then reads
   * the cell at that position in every row via `:nth-child` — this is the same
   * positional alignment EUI itself relies on, so it holds regardless of a
   * leading selection checkbox column. Throws (via a locator timeout) if no
   * column with that `field` is rendered.
   */
  async cells(field: string): Promise<Locator> {
    const header = this.root.locator(`[data-test-subj^="tableHeaderCell_${field}_"]`);
    const cellIndex = await header.evaluate((el) => (el as HTMLTableCellElement).cellIndex);
    return this.rows.locator(`td:nth-child(${cellIndex + 1})`);
  }
}
