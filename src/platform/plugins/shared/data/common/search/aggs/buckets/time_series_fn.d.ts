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
import type { BUCKET_TYPES } from '..';
export declare const aggTimeSeriesFnName = 'aggTimeSeries';
type Input = any;
type Output = AggExpressionType;
type AggArgs = AggExpressionFunctionArgs<typeof BUCKET_TYPES.TIME_SERIES>;
type FunctionDefinition = ExpressionFunctionDefinition<
  typeof aggTimeSeriesFnName,
  Input,
  AggArgs,
  Output
>;
export declare const aggTimeSeries: () => FunctionDefinition;
export {};
