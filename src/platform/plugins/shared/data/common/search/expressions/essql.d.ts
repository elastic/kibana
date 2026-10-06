/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { Datatable, ExpressionFunctionDefinition } from '@kbn/expressions-plugin/common';
import type { ISearchMethods } from '@kbn/search-types';
import type { NowProviderPublicContract } from '../../../public';
import type { UiSettingsCommon } from '../..';
import type { KibanaContext } from '..';
type Input = KibanaContext | null;
type Output = Promise<Datatable>;
interface Arguments {
  query: string;
  parameter?: Array<string | number | boolean>;
  count?: number;
  timezone?: string;
  timeField?: string;
}
export type EssqlExpressionFunctionDefinition = ExpressionFunctionDefinition<
  'essql',
  Input,
  Arguments,
  Output
>;
interface EssqlFnArguments {
  getStartDependencies(getKibanaRequest: () => KibanaRequest): Promise<EssqlStartDependencies>;
}
interface EssqlStartDependencies {
  nowProvider?: NowProviderPublicContract;
  searchService: ISearchMethods;
  uiSettings: UiSettingsCommon;
}
export declare const getEssqlFn: ({
  getStartDependencies,
}: EssqlFnArguments) => EssqlExpressionFunctionDefinition;
export {};
