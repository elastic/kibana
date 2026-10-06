/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Assign } from '@kbn/utility-types';
import type { ExpressionFunctionDefinition } from '@kbn/expressions-plugin/common';
import type { AggExpressionType, AggExpressionFunctionArgs } from '..';
import type { METRIC_TYPES } from '..';
export declare const aggSerialDiffFnName = 'aggSerialDiff';
type Input = any;
type AggArgs = AggExpressionFunctionArgs<typeof METRIC_TYPES.SERIAL_DIFF>;
type Arguments = Assign<
  AggArgs,
  {
    customMetric?: AggExpressionType;
  }
>;
type Output = AggExpressionType;
type FunctionDefinition = ExpressionFunctionDefinition<
  typeof aggSerialDiffFnName,
  Input,
  Arguments,
  Output
>;
export declare const aggSerialDiff: () => FunctionDefinition;
export {};
