/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ExpressionFunctionDefinition } from '@kbn/expressions-plugin/common';
import type { DataViewsContract } from '../data_views';
import type { DataViewSpec } from '..';
declare const name = 'indexPatternLoad';
declare const type = 'index_pattern';
/**
 * Index pattern expression interface
 * @public
 */
export interface IndexPatternExpressionType {
  /**
   * Expression type
   */
  type: typeof type;
  /**
   * Value - DataViewSpec
   */
  value: DataViewSpec;
}
type Input = null;
type Output = Promise<IndexPatternExpressionType>;
interface Arguments {
  id: string;
  includeFields?: boolean;
}
/** @internal */
export interface IndexPatternLoadStartDependencies {
  indexPatterns: DataViewsContract;
}
export type IndexPatternLoadExpressionFunctionDefinition = ExpressionFunctionDefinition<
  typeof name,
  Input,
  Arguments,
  Output
>;
export declare const getIndexPatternLoadMeta: () => Omit<
  IndexPatternLoadExpressionFunctionDefinition,
  'fn'
>;
export {};
