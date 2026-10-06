/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ExpressionFunctionDefinition } from '@kbn/expressions-plugin/common';
import type { AggExpressionType, AggConfigSerialized } from '..';
import type { AggParamsShardDelay } from './shard_delay';
export declare const aggShardDelayFnName = 'aggShardDelay';
type Input = any;
type Arguments = AggParamsShardDelay & Pick<AggConfigSerialized, 'id' | 'enabled' | 'schema'>;
type Output = AggExpressionType;
type FunctionDefinition = ExpressionFunctionDefinition<
  typeof aggShardDelayFnName,
  Input,
  Arguments,
  Output
>;
export declare const aggShardDelay: () => FunctionDefinition;
export {};
