/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FieldFormatParams } from '@kbn/field-formats-plugin/common';
import { ES_FIELD_TYPES } from '@kbn/field-types';

const EXCLUDED_FIELDS_TYPES_FROM_UNITS_FORMATTER = [
  ES_FIELD_TYPES.HISTOGRAM,
  ES_FIELD_TYPES.EXPONENTIAL_HISTOGRAM,
  ES_FIELD_TYPES.AGGREGATE_METRIC_DOUBLE,
  ES_FIELD_TYPES.TDIGEST,
];

/**
 * Returns true if the unit formatter can be applied to the given ES field type.
 * Field types whose values are objects cannot be formatted by the units formatter.
 * @param esTypes - The ES field types to check.
 * @returns True if the unit formatter can be applied, false otherwise.
 */
export const canUnitFormatterBeApplied = (esTypes: string[]) => {
  return !EXCLUDED_FIELDS_TYPES_FROM_UNITS_FORMATTER.some((excludedType) =>
    esTypes.includes(excludedType)
  );
};

const timeUnitToDurationFmt = (inputFormat = 'milliseconds') => {
  return {
    id: 'duration',
    params: {
      inputFormat,
      outputFormat: 'humanizePrecise',
      outputPrecision: 2,
      includeSpaceWithSuffix: true,
      useShortSuffix: true,
    },
  };
};

export const metaUnitsToFormatter: Record<string, { id: string; params?: FieldFormatParams }> = {
  percent: { id: 'percent' },
  byte: { id: 'bytes' },
  nanos: timeUnitToDurationFmt('nanoseconds'),
  micros: timeUnitToDurationFmt('microseconds'),
  ms: timeUnitToDurationFmt('milliseconds'),
  s: timeUnitToDurationFmt('seconds'),
  m: timeUnitToDurationFmt('minutes'),
  h: timeUnitToDurationFmt('hours'),
  d: timeUnitToDurationFmt('days'),
};
