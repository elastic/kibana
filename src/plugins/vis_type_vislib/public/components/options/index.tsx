/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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
