/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ESQLAstPromqlCommand } from '@elastic/esql/types';
import { type PromQLFunctionDefinition, type PromQLFunctionParamType } from '../types';
export declare const getPromqlFunctionDefinition: (
  name: string | undefined
) => PromQLFunctionDefinition | undefined;
export declare const getPromqlOperatorDefinition: (
  operator: string | undefined
) => PromQLFunctionDefinition | undefined;
export declare function getPromqlFunctionParamTypes(
  name: string | undefined,
  paramIndex: number
): PromQLFunctionParamType[];
export declare const getPromqlBinaryOperatorParamTypes: (
  operator: string,
  paramIndex: number
) => PromQLFunctionParamType[];
export declare const isPromqlAcrossSeriesFunction: (name: string) => boolean;
export declare function getPreGroupedAggregationName(textBeforeCursor: string): string | undefined;
export declare function getIndexFromPromQLParams({
  params,
  query,
}: ESQLAstPromqlCommand): string | undefined;
