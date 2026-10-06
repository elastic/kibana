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
import type { BUCKET_TYPES } from '..';
import type { CidrOutput, IpRangeOutput } from '../../expressions';
export declare const aggIpRangeFnName = 'aggIpRange';
type Input = any;
type AggArgs = AggExpressionFunctionArgs<typeof BUCKET_TYPES.IP_RANGE>;
type Arguments = Assign<
  AggArgs,
  {
    ranges?: Array<CidrOutput | IpRangeOutput>;
    ipRangeType?: string;
  }
>;
type Output = AggExpressionType;
type FunctionDefinition = ExpressionFunctionDefinition<
  typeof aggIpRangeFnName,
  Input,
  Arguments,
  Output
>;
export declare const aggIpRange: () => FunctionDefinition;
export {};
