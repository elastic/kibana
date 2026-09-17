/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export { buildTrendlineQueryCases, type TrendlineQueryCase } from './src/trendline_query_cases';
export {
  buildEsqlConversionCasesByGroup,
  createEsqlConversionIndexPattern,
  createEsqlConversionInput,
  createEsqlConversionUiSettings,
  ESQL_CONVERSION_DATE_RANGE,
  ESQL_CONVERSION_DATASETS,
  ESQL_CONVERSION_NOW,
  type EsqlConversionCase,
  type EsqlConversionColumn,
  type EsqlConversionDataset,
  type EsqlConversionDatasetId,
  type FailedEsqlConversionCase,
  isFailedEsqlConversionCase,
  type SuccessfulEsqlConversionCase,
  isSuccessfulEsqlConversionCase,
} from './src/esql_conversion_cases';
