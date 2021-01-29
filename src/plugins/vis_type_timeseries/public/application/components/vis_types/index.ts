/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React, { lazy } from 'react';

import { IUiSettingsClient } from 'src/core/public';
import { PersistedState } from 'src/plugins/visualizations/public';

import { TimeseriesVisParams } from '../../../metrics_fn';
import { TimeseriesVisData } from '../../../../common/types';

/**
 * Lazy load each visualization type, since the only one is presented on the screen at the same time.
 * Disable typescript errors since the components are not typed yet.
 */

// @ts-expect-error
const timeseries = lazy(() => import('./timeseries/vis'));
// @ts-expect-error
const metric = lazy(() => import('./metric/vis'));
// @ts-expect-error
const topN = lazy(() => import('./top_n/vis'));
// @ts-expect-error
const table = lazy(() => import('./table/vis'));
// @ts-expect-error
const gauge = lazy(() => import('./gauge/vis'));
// @ts-expect-error
const markdown = lazy(() => import('./markdown/vis'));

export const TimeseriesVisTypes: Record<string, React.ComponentType<TimeseriesVisProps>> = {
  timeseries,
  metric,
  top_n: topN,
  table,
  gauge,
  markdown,
};

export interface TimeseriesVisProps {
  model: TimeseriesVisParams;
  onBrush: (gte: string, lte: string) => void;
  onUiState: (
    field: string,
    value: {
      column: string;
      order: string;
    }
  ) => void;
  uiState: PersistedState;
  visData: TimeseriesVisData;
  getConfig: IUiSettingsClient['get'];
}
