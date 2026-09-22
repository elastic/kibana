/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DateRange, IndexPattern, OriginalColumn, ValueFormatConfig } from '../types';
import type { DateHistogramIndexPatternColumn } from '../datasources/operations';
import type { FormBasedLayer, GenericIndexPatternColumn } from '../datasources/types';
import { isColumnOfType } from '../datasources/form_based/helpers';
import { getTimeZoneAndInterval } from './operations/date_histogram_helpers';
import { getDefaultLabelFn } from './operations/default_labels';
import type { UiSettingsReader } from './operations/types';

export interface CreateEsAggsIdMapEntryParams {
  col: GenericIndexPatternColumn;
  colId: string;
  layer: FormBasedLayer;
  indexPattern: IndexPattern;
  uiSettings: UiSettingsReader;
  dateRange: DateRange;
  /** Format configuration for the column (accepts ValueFormatConfig or serialized format) */
  format?: ValueFormatConfig | Record<string, unknown>;
  /** Interval for date histogram buckets (in ms) */
  interval?: number;
  /** Whether to include sourceField in the output (for bucket columns) */
  includeSourceField?: boolean;
}

/**
 * Creates an entry for the esAggsIdMap with consistent structure.
 * Used for metrics, buckets, and static values in ES|QL conversion.
 */
export function createEsAggsIdMapEntry({
  col,
  colId,
  layer,
  indexPattern,
  format,
  interval,
  uiSettings,
  dateRange,
  includeSourceField = false,
}: CreateEsAggsIdMapEntryParams): OriginalColumn[] {
  const label = col.customLabel
    ? col.label
    : getDefaultLabelFn(col.operationType)?.(
        col,
        layer.columns,
        indexPattern,
        uiSettings,
        dateRange
      ) ?? col.label;

  // Build the entry with proper typing for the discriminated union
  if (
    isColumnOfType<DateHistogramIndexPatternColumn>('date_histogram', col) &&
    interval !== undefined
  ) {
    const sourceField = col.sourceField ? col.sourceField : indexPattern.timeFieldName ?? '';
    const { usedField } = getTimeZoneAndInterval({ ...col, sourceField }, indexPattern);

    const dropPartials = Boolean(
      col.params?.dropPartials &&
        (indexPattern.timeFieldName === usedField?.name || !col.params?.ignoreTimeRange)
    );

    return [
      {
        id: colId,
        label,
        operationType: 'date_histogram',
        sourceField: col.sourceField!,
        interval,
        dropPartials,
        ...(format !== undefined ? { format } : {}),
        ...(col.dataType ? { dataType: col.dataType } : {}),
        ...(col.customLabel ? { customLabel: col.customLabel } : {}),
      },
    ];
  }

  // Non-date_histogram columns
  return [
    {
      id: colId,
      label,
      operationType: col.operationType,
      interval: undefined as never,
      ...(includeSourceField && 'sourceField' in col ? { sourceField: col.sourceField } : {}),
      ...(format !== undefined ? { format } : {}),
      ...(col.dataType ? { dataType: col.dataType } : {}),
      ...(col.customLabel ? { customLabel: col.customLabel } : {}),
    },
  ];
}
