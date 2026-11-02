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

export const isFilterableColumnSet = (columns: Array<DatatableColumn | undefined>): boolean => {
  const defined = columns.filter((c): c is DatatableColumn => c != null);
  return !defined.some((col) => isNonFilterableComputedColumn(col));
};

/**
 * Returns the warning message to show when filterable chart columns are computed ES|QL fields
 * that cannot be used for filtering.
 */
export const getFilterDrilldownWarningMessage = (
  columns: Array<DatatableColumn | undefined>
): string | undefined => {
  const defined = columns.filter((c): c is DatatableColumn => c != null);
  if (defined.length === 0) {
    return undefined;
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
