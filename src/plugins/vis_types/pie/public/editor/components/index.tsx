/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { lazy } from 'react';
import { VisEditorOptionsProps } from '../../../../../visualizations/public';
import { PieTypeProps } from '../../types';
import { PieVisParams } from '../../../../../chart_expressions/expression_pie/common';

const PieOptionsLazy = lazy(() => import('./pie'));

export const getPieOptions =
  ({ showElasticChartsOptions, palettes, trackUiMetric }: PieTypeProps) =>
  (props: VisEditorOptionsProps<PieVisParams>) =>
    (
      <PieOptionsLazy
        {...props}
        palettes={palettes}
        showElasticChartsOptions={showElasticChartsOptions}
        trackUiMetric={trackUiMetric}
      />
    );
