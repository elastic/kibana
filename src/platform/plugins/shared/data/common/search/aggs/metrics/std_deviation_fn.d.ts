/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ExpressionFunctionDefinition } from '@kbn/expressions-plugin/common';
import type { AggExpressionType, AggExpressionFunctionArgs } from '..';
import type { METRIC_TYPES } from '..';
export declare const aggStdDeviationFnName = 'aggStdDeviation';
type Input = any;
type AggArgs = AggExpressionFunctionArgs<typeof METRIC_TYPES.STD_DEV>;
type Output = AggExpressionType;
type FunctionDefinition = ExpressionFunctionDefinition<
  typeof aggStdDeviationFnName,
  Input,
  AggArgs,
  Output
>;
export declare const aggStdDeviation: () => FunctionDefinition;
export {};
