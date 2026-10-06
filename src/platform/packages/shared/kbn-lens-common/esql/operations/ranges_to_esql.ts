/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { esql } from '@elastic/esql';
import { UI_SETTINGS } from '@kbn/data-plugin/common';

import { AUTO_BARS, LENS_RANGE_MODES, MIN_HISTOGRAM_BARS } from '../../datasources/constants';
import type { RangeIndexPatternColumn } from '../../datasources/operations';
import type { ToEsqlFn } from './types';

export const rangesToESQL: ToEsqlFn<RangeIndexPatternColumn> = (
  column,
  _columnId,
  _indexPattern,
  _layer,
  uiSettings
) => {
  if (column.params.includeEmptyRows || column.params.type === LENS_RANGE_MODES.Range) return;

  const maxBarsDefaultValue =
    (uiSettings.get<number>(UI_SETTINGS.HISTOGRAM_MAX_BARS) - MIN_HISTOGRAM_BARS) / 2;
  const maxBars = column.params.maxBars === AUTO_BARS ? maxBarsDefaultValue : column.params.maxBars;

  return { template: `BUCKET(${esql.col(column.sourceField)}, ${maxBars})` };
};
