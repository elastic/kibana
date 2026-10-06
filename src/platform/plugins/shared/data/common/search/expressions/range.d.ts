/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  ExpressionFunctionDefinition,
  ExpressionValueBoxed,
} from '@kbn/expressions-plugin/common';
interface Arguments {
  gt?: number | string;
  lt?: number | string;
  gte?: number | string;
  lte?: number | string;
}
export type KibanaRange = ExpressionValueBoxed<'kibana_range', Arguments>;
export type ExpressionFunctionRange = ExpressionFunctionDefinition<
  'range',
  null,
  Arguments,
  KibanaRange
>;
export declare const rangeFunction: ExpressionFunctionRange;
export {};
