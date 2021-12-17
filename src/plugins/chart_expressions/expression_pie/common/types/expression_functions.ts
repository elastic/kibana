/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PIE_LABELS_FUNCTION, PIE_LABELS_VALUE, PIE_VIS_EXPRESSION_NAME } from '../constants';
import {
  ExpressionFunctionDefinition,
  Datatable,
  ExpressionValueRender,
  ExpressionValueBoxed,
} from '../../../../expressions/common';
import { RenderValue, PieVisConfig } from './expression_renderers';

export interface Arguments {
  show: boolean;
  position: string;
  values: boolean;
  truncate: number | null;
  valuesFormat: string;
  lastLevel: boolean;
  percentDecimals: number;
}

export type ExpressionValuePieLabels = ExpressionValueBoxed<
  typeof PIE_LABELS_VALUE,
  {
    show: boolean;
    position: string;
    values: boolean;
    truncate: number | null;
    valuesFormat: string;
    last_level: boolean;
    percentDecimals: number;
  }
>;

export type PieVisExpressionFunctionDefinition = ExpressionFunctionDefinition<
  typeof PIE_VIS_EXPRESSION_NAME,
  Datatable,
  PieVisConfig,
  ExpressionValueRender<RenderValue>
>;
