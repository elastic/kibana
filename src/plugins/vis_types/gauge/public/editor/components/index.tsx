/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { lazy } from 'react';

import { VisEditorOptionsProps } from '@kbn/visualizations-plugin/public';
import { GaugeTypeProps, GaugeVisParams } from '../../types';

const GaugeOptionsLazy = lazy(() => import('./gauge'));

export const getGaugeOptions =
  ({ showElasticChartsOptions }: GaugeTypeProps) =>
  (props: VisEditorOptionsProps<GaugeVisParams>) =>
    <GaugeOptionsLazy {...props} showElasticChartsOptions={showElasticChartsOptions} />;
