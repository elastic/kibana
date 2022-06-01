/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback } from 'react';
import { GroupBy, SmallMultiples, Predicate } from '@elastic/charts';
import { ExpressionValueVisDimension } from '@kbn/visualizations-plugin/common';
import {
  getAccessorByDimension,
  getColumnByAccessor,
} from '@kbn/visualizations-plugin/common/utils';
import { Datatable } from '@kbn/expressions-plugin/public';
import { SerializedFieldFormat } from '@kbn/field-formats-plugin/common';
import { FormatFactory } from '../types';

interface SplitChartProps {
  splitColumnAccessor?: ExpressionValueVisDimension | string;
  splitRowAccessor?: ExpressionValueVisDimension | string;
  columns: Datatable['columns'];
  formatFactory: FormatFactory;
  fieldFormats: Record<string, SerializedFieldFormat | undefined>;
}

const SPLIT_COLUMN = '__split_column__';
const SPLIT_ROW = '__split_row__';

export const SplitChart = ({
  splitColumnAccessor,
  splitRowAccessor,
  columns,
  fieldFormats,
  formatFactory,
}: SplitChartProps) => {
  const format = useCallback(
    (value: unknown, accessor: ExpressionValueVisDimension | string) => {
      const formatParams = fieldFormats[getAccessorByDimension(accessor, columns)];
      const formatter = formatFactory(formatParams);
      return formatter.convert(value);
    },
    [columns, formatFactory, fieldFormats]
  );

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
          format={(value) => format(value, splitColumnAccessor)}
        />
      )}
      {splitRowAccessor && (
        <GroupBy
          id={SPLIT_ROW}
          by={(spec, datum) => getData(datum, splitRowAccessor)}
          sort={Predicate.DataIndex}
          format={(value) => format(value, splitRowAccessor)}
        />
      )}
      <SmallMultiples
        splitVertically={splitColumnAccessor ? SPLIT_COLUMN : undefined}
        splitHorizontally={splitRowAccessor ? SPLIT_ROW : undefined}
      />
    </>
  ) : null;
};
