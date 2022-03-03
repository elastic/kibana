/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { AccessorFn } from '@elastic/charts';
import { DatatableColumn } from '../../../../expressions/public';
import { FieldFormat, FormatFactory } from '../../../../field_formats/common';
import { ExpressionValueVisDimension } from '../../../../visualizations/common';
import { getColumnByAccessor } from '../../../../visualizations/common/utils';
import { getFormatter } from './formatters';

export const getSplitDimensionAccessor = (
  columns: DatatableColumn[],
  splitDimension: ExpressionValueVisDimension | string,
  formatters: Record<string, FieldFormat | undefined>,
  defaultFormatFactory: FormatFactory
): AccessorFn => {
  const splitChartColumn = getColumnByAccessor(splitDimension, columns)!;
  const accessor = splitChartColumn.id;
  const formatter = getFormatter(splitChartColumn, formatters, defaultFormatFactory);

  const fn: AccessorFn = (d) => {
    const v = d[accessor];
    if (v === undefined) {
      return;
    }

    const f = formatter.convert(v);
    return f;
  };

  return fn;
};
