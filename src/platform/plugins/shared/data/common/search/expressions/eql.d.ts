/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ExpressionFunctionDefinition } from '@kbn/expressions-plugin/common';
import type { ISearchMethods } from '@kbn/search-types';
import type { KibanaContext } from '..';
import type { DataViewsContract, UiSettingsCommon } from '../..';
import type { EqlRawResponse } from './eql_raw_response';
declare const name = 'eql';
type Input = KibanaContext | null;
type Output = Promise<EqlRawResponse>;
interface Arguments {
  query: string;
  index: string;
  size: number;
  field: string[];
}
export type EqlExpressionFunctionDefinition = ExpressionFunctionDefinition<
  typeof name,
  Input,
  Arguments,
  Output
>;
interface EqlStartDependencies {
  searchService: ISearchMethods;
  uiSettingsClient: UiSettingsCommon;
  dataViews: DataViewsContract;
}
export declare const getEqlFn: ({
  getStartDependencies,
}: {
  getStartDependencies: (getKibanaRequest: any) => Promise<EqlStartDependencies>;
}) => EqlExpressionFunctionDefinition;
export {};
