/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React, { lazy } from 'react';
import { VisOptionsProps } from 'src/plugins/vis_default_editor/public';
import { PieVisParams, PieTypeProps } from '../../types';

const PieOptionsLazy = lazy(() => import('./pie'));

export const getPieOptions = ({
  showElasticChartsOptions,
  palettes,
  trackUiMetric,
}: PieTypeProps) => (props: VisOptionsProps<PieVisParams>) => (
  <PieOptionsLazy
    {...props}
    palettes={palettes}
    showElasticChartsOptions={showElasticChartsOptions}
    trackUiMetric={trackUiMetric}
  />
);
