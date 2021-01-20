/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { VisParams } from 'src/plugins/visualizations/public';
import { IAggConfig } from 'src/plugins/data/public';
import { DefaultEditorAggCommonProps } from '../agg_common_props';

export interface AggControlProps {
  agg: IAggConfig;
  editorStateParams: VisParams;
  setAggParamValue: DefaultEditorAggCommonProps['setAggParamValue'];
  setStateParamValue: DefaultEditorAggCommonProps['setStateParamValue'];
}
