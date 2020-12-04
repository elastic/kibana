/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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
