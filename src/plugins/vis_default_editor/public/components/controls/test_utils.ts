/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { IAggConfig, AggParam } from 'src/plugins/data/public';
import { EditorConfig } from '../utils';
import { EditorVisState } from '../sidebar/state/reducers';

export const aggParamCommonPropsMock = {
  agg: {} as IAggConfig,
  aggParam: {} as AggParam,
  editorConfig: {} as EditorConfig,
  formIsTouched: false,
  metricAggs: [] as IAggConfig[],
  state: {} as EditorVisState,
  showValidation: false,
  schemas: [],
};
