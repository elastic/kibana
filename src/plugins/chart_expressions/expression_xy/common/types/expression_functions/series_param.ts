/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ExpressionValueBoxed } from '../../../../../expressions';
import { SeriesParam } from '../param';

export interface ExpressionValueSeriesParamArguments extends Omit<SeriesParam, 'data'> {
  label: string;
  id: string;
}

export type ExpressionValueSeriesParam = ExpressionValueBoxed<
  'series_param',
  {
    data: { label: string; id: string };
    drawLinesBetweenPoints?: boolean;
    interpolate?: SeriesParam['interpolate'];
    lineWidth?: number;
    mode: SeriesParam['mode'];
    show: boolean;
    showCircles: boolean;
    circlesRadius: number;
    seriesParamType: SeriesParam['type'];
    valueAxis: string;
  }
>;
