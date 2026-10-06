/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ExpressionFunctionDefinition } from '../types';
import type { FontLabel as FontFamily } from '../../fonts';
import type { Style } from '../../types';
import type { FontWeight, TextAlignment } from '../../types';
export interface FontArguments {
  align?: TextAlignment;
  color?: string;
  family?: FontFamily;
  italic?: boolean;
  lHeight?: number | null;
  size?: number;
  underline?: boolean;
  weight?: FontWeight;
  sizeUnit?: string;
}
export type ExpressionFunctionFont = ExpressionFunctionDefinition<
  'font',
  null,
  FontArguments,
  Style
>;
export declare const font: ExpressionFunctionFont;
