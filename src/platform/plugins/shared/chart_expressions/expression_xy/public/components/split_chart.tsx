/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback } from 'react';
import { GroupBy, SmallMultiples, Predicate } from '@elastic/charts';
import { ExpressionValueVisDimension } from '@kbn/visualizations-plugin/common';
import { getColumnByAccessor } from '@kbn/visualizations-plugin/common/utils';
import { Datatable } from '@kbn/expressions-plugin/public';

interface SplitChartProps {
  splitColumnAccessor?: ExpressionValueVisDimension | string;
  splitRowAccessor?: ExpressionValueVisDimension | string;
  columns: Datatable['columns'];
}

const SPLIT_COLUMN = '__split_column__';
const SPLIT_ROW = '__split_row__';

export const SplitChart = ({ splitColumnAccessor, splitRowAccessor, columns }: SplitChartProps) => {
  const getData = useCallback(
    (datum: Record<string, any>, accessor: ExpressionValueVisDimension | string) => {
      const splitColumn = getColumnByAccessor(accessor, columns);
      return datum[splitColumn!.id];
    },
    [columns]
  );

  return splitColumnAccessor || splitRowAccessor ? (
    <>
      {splitColumnAccessor && (
        <GroupBy
          id={SPLIT_COLUMN}
          by={(spec, datum) => getData(datum, splitColumnAccessor)}
          sort={Predicate.DataIndex}
        />
      )}
      {splitRowAccessor && (
        <GroupBy
          id={SPLIT_ROW}
          by={(spec, datum) => getData(datum, splitRowAccessor)}
          sort={Predicate.DataIndex}
        />
      )}
      <SmallMultiples
        splitVertically={splitRowAccessor ? SPLIT_ROW : undefined}
        splitHorizontally={splitColumnAccessor ? SPLIT_COLUMN : undefined}
      />
    </>
  ) : null;
};
