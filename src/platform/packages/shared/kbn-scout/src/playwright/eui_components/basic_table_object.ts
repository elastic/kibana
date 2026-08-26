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
 * Deliberately minimal — only `rows` and `cells(field)`. Row actions, sorting,
 * and pagination are excluded until a real migration needs them.
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
   * (`tableHeaderCell_<field>_<index>`, matched exactly so a column named e.g.
   * `status` doesn't also match a `status_detail` header) via its native
   * `cellIndex`, then reads the cell at that position in every row via
   * `:nth-child` — this is the same positional alignment EUI itself relies
   * on, so it holds regardless of a leading selection checkbox column.
   * Matches both `<td>` and `<th>`: EUI renders the `rowHeader` column's body
   * cell as a `<th scope="row">` for accessibility, not a `<td>`. Throws if
   * no column with that `field` is rendered.
   */
  async cells(field: string): Promise<Locator> {
    const escaped = field.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const cellIndex = await this.root.evaluate((tableEl, pattern) => {
      const regex = new RegExp(`^tableHeaderCell_${pattern}_\\d+$`);
      const headers = Array.from(tableEl.querySelectorAll('thead th, thead td'));
      const header = headers.find((el) => regex.test(el.getAttribute('data-test-subj') ?? '')) as
        | HTMLTableCellElement
        | undefined;
      if (!header) {
        throw new Error(`EuiBasicTableObject.cells: no column with field "${pattern}" found.`);
      }
      return header.cellIndex;
    }, escaped);
    return this.rows.locator(`:is(td, th):nth-child(${cellIndex + 1})`);
  }
}
