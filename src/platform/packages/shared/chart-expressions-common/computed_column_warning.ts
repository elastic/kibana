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

const getFilterDrilldownDisabledMessage = ({
  nonFilterableColumnNames,
  allColumnsNonFilterable,
}: {
  nonFilterableColumnNames: string[];
  allColumnsNonFilterable: boolean;
}) => {
  const count = nonFilterableColumnNames.length;

  if (allColumnsNonFilterable) {
    return i18n.translate(
      'chartExpressionsCommon.computedColumn.filterDrilldownDisabledDescription',
      {
        defaultMessage:
          "You can't apply a filter or drill down {count, plural, one {from this value because it relies on a field} other {from these values because they rely on fields}} created at query time.",
        values: { count },
      }
    );
  }

  const names = nonFilterableColumnNames.map((n) => `'${n}'`).join(', ');
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

// Note: hide warning message when the type is a date because it can be misleading
const showWarningForColumn = (column: DatatableColumn): boolean => {
  const nonFilterable = isNonFilterableComputedColumn(column);
  if (nonFilterable && column.meta.type === 'date') {
    return false;
  }
  return nonFilterable;
};

/**
 * Returns the warning message to show when filterable chart columns are computed ES|QL
 * fields that cannot be used for filtering. Returns `undefined` when there is nothing
 * to warn about.
 */
export const getNonFilterableComputedColumnWarning = (
  filterableColumns: Array<DatatableColumn | undefined>
): string | undefined => {
  const defined = filterableColumns.filter((c): c is DatatableColumn => c != null);
  if (defined.length === 0) {
    return undefined;
  }

  const nonFilterableColumnNamesWithColumnWarning = defined
    .filter((col) => showWarningForColumn(col))
    .map((col) => col.name);

  if (nonFilterableColumnNamesWithColumnWarning.length === 0) {
    return undefined;
  }

  const allColumnsNonFilterable =
    nonFilterableColumnNamesWithColumnWarning.length === defined.length;
  return getFilterDrilldownDisabledMessage({
    nonFilterableColumnNames: nonFilterableColumnNamesWithColumnWarning,
    allColumnsNonFilterable,
  });
};
