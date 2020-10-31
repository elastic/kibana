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

import { VisOptionsProps } from 'src/plugins/vis_default_editor/public';
import { ValidationVisOptionsProps } from '../common';
import { GaugeVisParams } from '../../gauge';
import { PieVisParams } from '../../pie';
import { BasicVislibParams } from '../../types';
import { HeatmapVisParams } from '../../heatmap';

const GaugeOptionsLazy = lazy(() => import('./gauge'));
const PieOptionsLazy = lazy(() => import('./pie'));
const PointSeriesOptionsLazy = lazy(() => import('./point_series'));
const HeatmapOptionsLazy = lazy(() => import('./heatmap'));
const MetricsAxisOptionsLazy = lazy(() => import('./metrics_axes'));

export const GaugeOptions = (props: VisOptionsProps<GaugeVisParams>) => (
  <GaugeOptionsLazy {...props} />
);

export const PieOptions = (props: VisOptionsProps<PieVisParams>) => <PieOptionsLazy {...props} />;

export const PointSeriesOptions = (props: ValidationVisOptionsProps<BasicVislibParams>) => (
  <PointSeriesOptionsLazy {...props} />
);

export const HeatmapOptions = (props: VisOptionsProps<HeatmapVisParams>) => (
  <HeatmapOptionsLazy {...props} />
);

export const MetricsAxisOptions = (props: ValidationVisOptionsProps<BasicVislibParams>) => (
  <MetricsAxisOptionsLazy {...props} />
);
