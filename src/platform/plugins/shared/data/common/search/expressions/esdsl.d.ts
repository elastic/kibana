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
import type { EsRawResponse } from './es_raw_response';
import type { KibanaContext } from '..';
import type { UiSettingsCommon } from '../..';
declare const name = 'esdsl';
type Input = KibanaContext | null;
type Output = Promise<EsRawResponse>;
interface Arguments {
  dsl: string;
  index: string;
  size: number;
}
export type EsdslExpressionFunctionDefinition = ExpressionFunctionDefinition<
  typeof name,
  Input,
  Arguments,
  Output
>;
interface EsdslStartDependencies {
  searchService: ISearchMethods;
  uiSettingsClient: UiSettingsCommon;
}
export declare const getEsdslFn: ({
  getStartDependencies,
}: {
  getStartDependencies: (getKibanaRequest: any) => Promise<EsdslStartDependencies>;
}) => EsdslExpressionFunctionDefinition;
export {};
