/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { FieldFormatParams } from '@kbn/field-formats-plugin/common';

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
