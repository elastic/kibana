/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { buildCoreCases } from './esql_conversion_cases/cases.core';
import { buildDateHistogramCases } from './esql_conversion_cases/cases.date_histogram';
import { buildStaticValueCases } from './esql_conversion_cases/cases.static_value';
import { buildTopNCases } from './esql_conversion_cases/cases.top_n';
import type { EsqlConversionCase, EsqlConversionCaseGroup } from './esql_conversion_cases/types';

export {
  createEsqlConversionIndexPattern,
  createEsqlConversionInput,
  createEsqlConversionUiSettings,
  ESQL_CONVERSION_DATASETS,
  ESQL_CONVERSION_DATE_RANGE,
  ESQL_CONVERSION_NOW,
} from './esql_conversion_cases/fixtures';
export type {
  EsqlConversionCase,
  EsqlConversionCaseGroup,
  EsqlConversionColumn,
  EsqlConversionDataset,
  EsqlConversionDatasetId,
  FailedEsqlConversionCase,
  SuccessfulEsqlConversionCase,
} from './esql_conversion_cases/types';
export {
  isFailedEsqlConversionCase,
  isSuccessfulEsqlConversionCase,
} from './esql_conversion_cases/types';

export const buildEsqlConversionCasesByGroup = (): Record<
  EsqlConversionCaseGroup,
  EsqlConversionCase[]
> => ({
  core: buildCoreCases(),
  date_histogram: buildDateHistogramCases(),
  top_n: buildTopNCases(),
  static_value: buildStaticValueCases(),
});
