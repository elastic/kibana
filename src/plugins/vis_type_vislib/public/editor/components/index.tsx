/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React, { lazy } from 'react';

import { VisOptionsProps } from '../../../../vis_default_editor/public';

import { GaugeVisParams } from '../../gauge';
import { HeatmapVisParams } from '../../heatmap';

const GaugeOptionsLazy = lazy(() => import('./gauge'));
const HeatmapOptionsLazy = lazy(() => import('./heatmap'));

export const GaugeOptions = (props: VisOptionsProps<GaugeVisParams>) => (
  <GaugeOptionsLazy {...props} />
);

export const HeatmapOptions = (props: VisOptionsProps<HeatmapVisParams>) => (
  <HeatmapOptionsLazy {...props} />
);
