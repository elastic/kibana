/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { AccessorFn } from '@elastic/charts';
import { DatatableColumn } from '../../../../expressions/public';
import type { FieldFormatsStart } from '../../../../field_formats/public';
import { Dimension } from '../types';

export const getSplitDimensionAccessor =
  (fieldFormats: FieldFormatsStart, columns: DatatableColumn[]) =>
  (splitDimension: Dimension): AccessorFn => {
    const formatter = fieldFormats.deserialize(splitDimension.format);
    const splitChartColumn = columns[splitDimension.accessor];
    const accessor = splitChartColumn.id;

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
