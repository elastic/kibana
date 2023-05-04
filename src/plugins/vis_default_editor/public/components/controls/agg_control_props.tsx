/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { VisParams } from '@kbn/visualizations-plugin/public';
import { IAggConfig } from '@kbn/data-plugin/public';
import { DefaultEditorAggCommonProps } from '../agg_common_props';

export interface AggControlProps {
  agg: IAggConfig;
  editorStateParams: VisParams;
  setAggParamValue: DefaultEditorAggCommonProps['setAggParamValue'];
  setStateParamValue: DefaultEditorAggCommonProps['setStateParamValue'];
}
