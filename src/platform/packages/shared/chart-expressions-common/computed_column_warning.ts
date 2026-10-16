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

const buildFilterDrilldownMessage = ({
  columnNamesToExplain,
  allColumnsNeedExplanation,
}: {
  columnNamesToExplain: string[];
  allColumnsNeedExplanation: boolean;
}) => {
  const count = columnNamesToExplain.length;

  if (allColumnsNeedExplanation) {
    return i18n.translate(
      'chartExpressionsCommon.computedColumn.filterDrilldownDisabledDescription',
      {
        defaultMessage:
          "You can't apply a filter or drill down {count, plural, one {from this value because it relies on a field} other {from these values because they rely on fields}} created at query time.",
        values: { count },
      }
    );
  }

  const names = columnNamesToExplain.map((n) => `'${n}'`).join(', ');
  return i18n.translate(
    'chartExpressionsCommon.computedColumn.partialFilterDrilldownDisabledDescription',
    {
      defaultMessage:
        "You can't apply a filter or drill down from {names} because {count, plural, one {it relies on a field} other {they rely on fields}} created at query time.",
      values: { names, count },
    }
  );
};

const isNonFilterableComputedColumn = (column: DatatableColumn): boolean => {
  if (column.isComputedColumn !== true) {
    return false;
  }
  return column.meta?.sourceParams?.isSourceFieldFilterable !== true;
};

// match_phrase query cannot find an empty string because of how text fields are tokenized and analyzed
const isBlankEsqlTextField = (column: DatatableColumn, value: unknown): boolean =>
  column.meta?.esType === 'text' && value === '';

export const isFilterableColumnSet = (
  columns: Array<DatatableColumn | undefined>,
  values?: unknown[]
): boolean => {
  return !columns.some((col, i) => {
    if (col == null) return false;
    if (isNonFilterableComputedColumn(col)) return true;
    return values !== undefined && isBlankEsqlTextField(col, values[i]);
  });
};

/**
 * Returns the warning message to show when chart columns cannot be used for filtering.
 */
export const getFilterDrilldownWarningMessage = (
  columns: Array<DatatableColumn | undefined>,
  values?: unknown[]
): string | undefined => {
  const defined = columns.filter((c): c is DatatableColumn => c != null);
  if (defined.length === 0) {
    return undefined;
  }

  if (
    values !== undefined &&
    columns.some((col, i) => col != null && isBlankEsqlTextField(col, values[i]))
  ) {
    return i18n.translate(
      'chartExpressionsCommon.computedColumn.blankTextFieldFilterDisabledDescription',
      {
        defaultMessage:
          "You can't apply a filter or drill down from a blank text field value. To filter by blank values, use a keyword field instead.",
      }
    );
  }

  // Suppress the message for date columns (product decision).
  const columnNamesToExplain = defined
    .filter((col) => isNonFilterableComputedColumn(col) && col.meta.type !== 'date')
    .map((col) => col.name);

  if (columnNamesToExplain.length === 0) {
    return undefined;
  }

  return buildFilterDrilldownMessage({
    columnNamesToExplain,
    allColumnsNeedExplanation: columnNamesToExplain.length === defined.length,
  });
};
