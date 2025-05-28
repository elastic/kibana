/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { type CustomPaletteState } from '@kbn/charts-plugin/common';
import { type PaletteOutput, CUSTOM_PALETTE } from '@kbn/coloring';
import type { Datatable } from '@kbn/expressions-plugin/common';
import { type SerializedFieldFormat } from '@kbn/field-formats-plugin/common';
import { type ExpressionValueVisDimension } from '@kbn/visualizations-plugin/common';
import { getColumnByAccessor, getFormatByAccessor } from '@kbn/visualizations-plugin/common/utils';
import { getFormatService, getPaletteService } from '../services';
import { getDataBoundsForPalette } from '../utils';

function enhanceFieldFormat(serializedFieldFormat: SerializedFieldFormat | undefined) {
  const formatId = serializedFieldFormat?.id || 'number';
  if (formatId === 'duration' && !serializedFieldFormat?.params?.formatOverride) {
    return {
      ...serializedFieldFormat,
      params: {
        // by default use the compact precise format
        outputFormat: 'humanizePrecise',
        outputPrecision: 1,
        useShortSuffix: true,
        // but if user configured something else, use it
        ...serializedFieldFormat!.params,
      },
    };
  }
  return serializedFieldFormat ?? { id: formatId };
}

export const getMetricFormatter = (
  accessor: ExpressionValueVisDimension | string,
  columns: Datatable['columns']
) => {
  const type = getColumnByAccessor(accessor, columns)?.meta.type;
  const defaultFormat = type ? { id: type } : undefined;
  const serializedFieldFormat = getFormatByAccessor(accessor, columns, defaultFormat);
  const enhancedFieldFormat = enhanceFieldFormat(serializedFieldFormat);
  return getFormatService().deserialize(enhancedFieldFormat).getConverterFor('text');
};

export const getColor = (
  value: number,
  palette: PaletteOutput<CustomPaletteState>,
  accessors: { metric: string; max?: string; breakdownBy?: string },
  data: Datatable,
  rowNumber: number
) => {
  const { min, max } = getDataBoundsForPalette(accessors, data, rowNumber);

  return getPaletteService().get(CUSTOM_PALETTE)?.getColorForValue?.(value, palette.params, {
    min,
    max,
  });
};
