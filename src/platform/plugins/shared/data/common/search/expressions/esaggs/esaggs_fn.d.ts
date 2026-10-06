/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Observable } from 'rxjs';
import type { Datatable, ExpressionFunctionDefinition } from '@kbn/expressions-plugin/common';
import type { IndexPatternExpressionType } from '@kbn/data-views-plugin/common/expressions';
import type { DataViewsContract } from '@kbn/data-views-plugin/common';
import type { AggsStart, AggExpressionType } from '../../aggs';
import type { ISearchStartSearchSource } from '../../search_source';
import type { KibanaContext } from '../kibana_context_type';
import { handleRequest } from './request_handler';
type Input = KibanaContext | null;
type Output = Observable<Datatable>;
interface Arguments {
  index: IndexPatternExpressionType;
  aggs?: AggExpressionType[];
  metricsAtAllLevels?: boolean;
  partialRows?: boolean;
  timeFields?: string[];
  probability?: number;
  samplerSeed?: number;
  ignoreGlobalFilters?: boolean;
}
export type EsaggsExpressionFunctionDefinition = ExpressionFunctionDefinition<
  'esaggs',
  Input,
  Arguments,
  Output
>;
/** @internal */
export interface EsaggsStartDependencies {
  aggs: AggsStart;
  dataViews: DataViewsContract;
  searchSource: ISearchStartSearchSource;
  getNow?: () => Date;
}
/** @internal */
export declare const getEsaggsMeta: () => Omit<EsaggsExpressionFunctionDefinition, 'fn'>;
export { handleRequest as handleEsaggsRequest };
export type { RequestHandlerParams } from './request_handler';
