/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { ISearchMethods } from '@kbn/search-types';
import type { Datatable, ExpressionFunctionDefinition } from '@kbn/expressions-plugin/common';
import { type KibanaContext } from '..';
import type { UiSettingsCommon } from '../..';
declare global {
  interface Window {
    /**
     * Debug setting to make requests complete slower than normal. Only available on snapshots where `error_query` is enabled in ES.
     */
    ELASTIC_ESQL_DELAY_SECONDS?: number;
  }
}
type Input = KibanaContext | null;
type Output = Promise<Datatable>;
interface Arguments {
  query: string;
  timeField?: string;
  locale?: string;
  /**
   * Requests' meta for showing in Inspector
   */
  titleForInspector?: string;
  descriptionForInspector?: string;
  ignoreGlobalFilters?: boolean;
}
export type EsqlExpressionFunctionDefinition = ExpressionFunctionDefinition<
  'esql',
  Input,
  Arguments,
  Output
>;
interface EsqlFnArguments {
  getStartDependencies(getKibanaRequest: () => KibanaRequest): Promise<EsqlStartDependencies>;
}
interface EsqlStartDependencies {
  searchService: ISearchMethods;
  uiSettings: UiSettingsCommon;
}
export declare const getEsqlFn: ({
  getStartDependencies,
}: EsqlFnArguments) => EsqlExpressionFunctionDefinition;
export {};
