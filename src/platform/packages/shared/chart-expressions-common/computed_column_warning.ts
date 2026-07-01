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

/**
 * Returns false if any of the given columns can't be filtered or drilled down into. Unaffected
 * by warning-message suppression rules (e.g. for dates, see `getFilterDrilldownWarningMessage`)
 * — this is the fact that filter/drilldown actions should be gated on.
 */
export const isFilterableColumnSet = (columns: Array<DatatableColumn | undefined>): boolean => {
  const defined = columns.filter((c): c is DatatableColumn => c != null);
  return !defined.some((col) => isNonFilterableComputedColumn(col));
};

/**
 * Returns the warning message to show when filterable chart columns are computed ES|QL fields
 * that cannot be used for filtering. Returns `undefined` when there is nothing to warn about,
 * including when every non-filterable column is a date — the "created at query time" message
 * reads as misleading for dates (product decision), so those are left out of the text even
 * though they're still non-filterable per `isFilterableColumnSet`.
 */
export const getFilterDrilldownWarningMessage = (
  columns: Array<DatatableColumn | undefined>
): string | undefined => {
  const defined = columns.filter((c): c is DatatableColumn => c != null);
  if (defined.length === 0) {
    return undefined;
  }

  const nonFilterableColumnNames = defined
    .filter((col) => isNonFilterableComputedColumn(col) && col.meta.type !== 'date')
    .map((col) => col.name);

  if (nonFilterableColumnNames.length === 0) {
    return undefined;
  }

  const allColumnsNonFilterable = nonFilterableColumnNames.length === defined.length;
  return getFilterDrilldownDisabledMessage({
    nonFilterableColumnNames,
    allColumnsNonFilterable,
  });
};
