/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { TimeseriesVisData, TableData, SeriesData } from './types';
import { PANEL_TYPES } from './enums';

export const isVisTableData = (data: TimeseriesVisData): data is TableData =>
  data.type === PANEL_TYPES.TABLE;

export const isVisSeriesData = (data: TimeseriesVisData): data is SeriesData =>
  data.type !== PANEL_TYPES.TABLE;
