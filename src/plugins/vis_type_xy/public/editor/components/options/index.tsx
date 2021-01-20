/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React, { lazy } from 'react';

import { VisParams } from '../../../types';
import { ValidationVisOptionsProps } from '../common';

const PointSeriesOptionsLazy = lazy(() => import('./point_series'));
const MetricsAxisOptionsLazy = lazy(() => import('./metrics_axes'));

export const PointSeriesOptions = (
  props: ValidationVisOptionsProps<
    VisParams,
    {
      showElasticChartsOptions: boolean;
    }
  >
) => <PointSeriesOptionsLazy {...props} />;

export const MetricsAxisOptions = (props: ValidationVisOptionsProps<VisParams>) => (
  <MetricsAxisOptionsLazy {...props} />
);
