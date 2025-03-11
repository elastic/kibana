/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  CollapseFunction,
  Column,
  PagingState,
  TableVisConfiguration,
} from '@kbn/visualizations-plugin/common';
import { TableVisParams } from '../../../common';

enum RowHeightMode {
  auto = 'auto',
  custom = 'custom',
}

const getColumns = (
  params: TableVisParams,
  metrics: string[],
  columns: Column[],
  bucketCollapseFn?: Record<CollapseFunction, string[]>
) => {
  const { showTotal, totalFunc } = params;
  return columns.map(({ columnId }) => {
    const collapseFn = bucketCollapseFn
      ? (Object.keys(bucketCollapseFn).find((key) =>
          bucketCollapseFn[key as CollapseFunction].includes(columnId)
        ) as CollapseFunction)
      : undefined;
    return {
      columnId,
      alignment: 'left' as const,
      ...(showTotal && metrics.includes(columnId) ? { summaryRow: totalFunc } : {}),
      ...(collapseFn ? { collapseFn } : {}),
    };
  });
};

const getPagination = ({ perPage }: TableVisParams): PagingState => {
  return {
    enabled: perPage !== '',
    size: perPage !== '' ? perPage : 0,
  };
};

const getRowHeight = (
  params: TableVisParams
): Pick<TableVisConfiguration, 'rowHeight' | 'headerRowHeight'> => {
  const { autoFitRowToContent } = params;
  return {
    rowHeight: autoFitRowToContent ? RowHeightMode.auto : RowHeightMode.custom,
    headerRowHeight: autoFitRowToContent ? RowHeightMode.auto : RowHeightMode.custom,
  };
};

export const getConfiguration = (
  layerId: string,
  params: TableVisParams,
  {
    metrics,
    buckets,
    columnsWithoutReferenced,
    bucketCollapseFn,
  }: {
    metrics: string[];
    buckets: {
      all: string[];
      customBuckets: Record<string, string>;
    };
    columnsWithoutReferenced: Column[];
    bucketCollapseFn?: Record<CollapseFunction, string[]>;
  }
): TableVisConfiguration => {
  return {
    layerId,
    layerType: 'data',
    columns: getColumns(params, metrics, columnsWithoutReferenced, bucketCollapseFn),
    paging: getPagination(params),
    ...getRowHeight(params),
  };
};
