/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import type { DatatableRow } from '@kbn/expressions-plugin/common';
import { AggTypes } from '../../common';

const totalAggregations = [
  {
    value: AggTypes.SUM,
    text: i18n.translate('visTypeTable.totalAggregations.sumText', {
      defaultMessage: 'Sum',
    }),
  },
  {
    value: AggTypes.AVG,
    text: i18n.translate('visTypeTable.totalAggregations.averageText', {
      defaultMessage: 'Average',
    }),
  },
  {
    value: AggTypes.MIN,
    text: i18n.translate('visTypeTable.totalAggregations.minText', {
      defaultMessage: 'Min',
    }),
  },
  {
    value: AggTypes.MAX,
    text: i18n.translate('visTypeTable.totalAggregations.maxText', {
      defaultMessage: 'Max',
    }),
  },
  {
    value: AggTypes.COUNT,
    text: i18n.translate('visTypeTable.totalAggregations.countText', {
      defaultMessage: 'Count',
    }),
  },
];

const sortNullsLast = (
  rows: DatatableRow[],
  direction: 'asc' | 'desc',
  id: string
): DatatableRow[] => {
  return rows.sort((row1, row2) => {
    const rowA = row1[id];
    const rowB = row2[id];

    if (rowA === null) {
      return 1;
    }
    if (rowB === null) {
      return -1;
    }
    if (rowA === rowB) {
      return 0;
    }

    if (direction === 'desc') {
      return rowA < rowB ? 1 : -1;
    } else {
      return rowA < rowB ? -1 : 1;
    }
  });
};

export { totalAggregations, sortNullsLast };
