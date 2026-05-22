/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DatatableColumn } from '@kbn/expressions-plugin/common';
import { i18n } from '@kbn/i18n';

function getComputedColumnFilterDisabledMessage({
  computedColumnNames,
  allColumnsAreComputed,
  panelHasConfiguredDrilldowns,
}: {
  computedColumnNames: string[];
  allColumnsAreComputed: boolean;
  panelHasConfiguredDrilldowns: boolean;
}): string {
  const hasDrilldowns = String(panelHasConfiguredDrilldowns);
  const count = computedColumnNames.length;

  if (allColumnsAreComputed) {
    return i18n.translate('chartExpressionsCommon.computedColumnFilterDisabledMessage', {
      defaultMessage:
        "You can't apply a filter {hasDrilldowns, select, true {or drill down } other {}}{count, plural, one {from this value because it relies on a field} other {from these values because they rely on fields}} created at query time.",
      values: { hasDrilldowns, count },
    });
  }

  const names = computedColumnNames.map((n) => `'${n}'`).join(', ');
  return i18n.translate('chartExpressionsCommon.partialComputedColumnFilterDisabledMessage', {
    defaultMessage:
      "You can't apply a filter {hasDrilldowns, select, true {or drill down } other {}}from {names} because {count, plural, one {it relies on a field} other {they rely on fields}} created at query time.",
    values: { hasDrilldowns, names, count },
  });
}

/**
 * Returns the warning message to show when filterable chart columns are computed ES|QL
 * fields that cannot be used for filtering. Returns `undefined` when there is nothing
 * to warn about.
 *
 * The caller is responsible for:
 *  - Passing only the columns that represent filterable dimensions (x-axis, y-axis,
 *    split accessors, etc.) — not every column in the table.
 *  - Deduplicating columns when the same column ID appears across multiple layers.
 *  - Checking `isEsqlMode` before calling (pass an empty array or skip the call entirely
 *    when not in ES|QL mode).
 */
export const getComputedColumnWarningForColumns = (
  filterableColumns: Array<DatatableColumn | undefined>,
  panelHasConfiguredDrilldowns: boolean
): string | undefined => {
  const defined = filterableColumns.filter((c): c is DatatableColumn => c != null);
  if (defined.length === 0) return undefined;

  const computedColumnNames = defined.filter((col) => col.isComputedColumn).map((col) => col.name);

  if (computedColumnNames.length === 0) return undefined;

  const allColumnsAreComputed = computedColumnNames.length === defined.length;
  return getComputedColumnFilterDisabledMessage({
    computedColumnNames,
    allColumnsAreComputed,
    panelHasConfiguredDrilldowns,
  });
};
