/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as t from 'io-ts';

import {
  budgetingMethodSchema,
  dateType,
  historicalSummarySchema,
  indicatorSchema,
  indicatorTypesArraySchema,
  objectiveSchema,
  optionalSettingsSchema,
  settingsSchema,
  sloIdSchema,
  summarySchema,
  tagsSchema,
  timeWindowSchema,
  metricCustomIndicatorSchema,
  kqlCustomIndicatorSchema,
  apmTransactionErrorRateIndicatorSchema,
  apmTransactionDurationIndicatorSchema,
} from '../schema';

const createSLOParamsSchema = t.type({
  body: t.intersection([
    t.type({
      name: t.string,
      description: t.string,
      indicator: indicatorSchema,
      timeWindow: timeWindowSchema,
      budgetingMethod: budgetingMethodSchema,
      objective: objectiveSchema,
    }),
    t.partial({ id: sloIdSchema, settings: optionalSettingsSchema, tags: tagsSchema }),
  ]),
});

const createSLOResponseSchema = t.type({
  id: sloIdSchema,
});

const deleteSLOParamsSchema = t.type({
  path: t.type({
    id: sloIdSchema,
  }),
});

const getSLOParamsSchema = t.type({
  path: t.type({
    id: sloIdSchema,
  }),
});

const sortDirectionSchema = t.union([t.literal('asc'), t.literal('desc')]);
const sortBySchema = t.union([t.literal('creationTime'), t.literal('indicatorType')]);

const findSLOParamsSchema = t.partial({
  query: t.partial({
    name: t.string,
    indicatorTypes: indicatorTypesArraySchema,
    page: t.string,
    perPage: t.string,
    sortBy: sortBySchema,
    sortDirection: sortDirectionSchema,
  }),
});

const sloResponseSchema = t.type({
  id: sloIdSchema,
  name: t.string,
  description: t.string,
  indicator: indicatorSchema,
  timeWindow: timeWindowSchema,
  budgetingMethod: budgetingMethodSchema,
  objective: objectiveSchema,
  revision: t.number,
  settings: settingsSchema,
  enabled: t.boolean,
  tags: tagsSchema,
  createdAt: dateType,
  updatedAt: dateType,
});

const sloWithSummaryResponseSchema = t.intersection([
  sloResponseSchema,
  t.type({ summary: summarySchema }),
]);

const getSLOResponseSchema = sloWithSummaryResponseSchema;

const updateSLOParamsSchema = t.type({
  path: t.type({
    id: sloIdSchema,
  }),
  body: t.partial({
    name: t.string,
    description: t.string,
    indicator: indicatorSchema,
    timeWindow: timeWindowSchema,
    budgetingMethod: budgetingMethodSchema,
    objective: objectiveSchema,
    settings: optionalSettingsSchema,
    tags: tagsSchema,
  }),
});

const manageSLOParamsSchema = t.type({
  path: t.type({ id: sloIdSchema }),
});

const updateSLOResponseSchema = sloResponseSchema;

const findSLOResponseSchema = t.type({
  page: t.number,
  perPage: t.number,
  total: t.number,
  results: t.array(sloWithSummaryResponseSchema),
});

const fetchHistoricalSummaryParamsSchema = t.type({
  body: t.type({ sloIds: t.array(sloIdSchema) }),
});
const fetchHistoricalSummaryResponseSchema = t.record(
  sloIdSchema,
  t.array(historicalSummarySchema)
);

const getSLODiagnosisParamsSchema = t.type({
  path: t.type({ id: t.string }),
});

type SLOResponse = t.OutputOf<typeof sloResponseSchema>;
type SLOWithSummaryResponse = t.OutputOf<typeof sloWithSummaryResponseSchema>;

type CreateSLOInput = t.OutputOf<typeof createSLOParamsSchema.props.body>; // Raw payload sent by the frontend
type CreateSLOParams = t.TypeOf<typeof createSLOParamsSchema.props.body>; // Parsed payload used by the backend
type CreateSLOResponse = t.TypeOf<typeof createSLOResponseSchema>; // Raw response sent to the frontend

type GetSLOResponse = t.OutputOf<typeof getSLOResponseSchema>;

type ManageSLOParams = t.TypeOf<typeof manageSLOParamsSchema.props.path>;

type UpdateSLOInput = t.OutputOf<typeof updateSLOParamsSchema.props.body>;
type UpdateSLOParams = t.TypeOf<typeof updateSLOParamsSchema.props.body>;
type UpdateSLOResponse = t.OutputOf<typeof updateSLOResponseSchema>;

type FindSLOParams = t.TypeOf<typeof findSLOParamsSchema.props.query>;
type FindSLOResponse = t.OutputOf<typeof findSLOResponseSchema>;

type FetchHistoricalSummaryParams = t.TypeOf<typeof fetchHistoricalSummaryParamsSchema.props.body>;
type FetchHistoricalSummaryResponse = t.OutputOf<typeof fetchHistoricalSummaryResponseSchema>;
type HistoricalSummaryResponse = t.OutputOf<typeof historicalSummarySchema>;

type BudgetingMethod = t.TypeOf<typeof budgetingMethodSchema>;

type MetricCustomIndicatorSchema = t.TypeOf<typeof metricCustomIndicatorSchema>;
type KQLCustomIndicatorSchema = t.TypeOf<typeof kqlCustomIndicatorSchema>;
type APMTransactionErrorRateIndicatorSchema = t.TypeOf<
  typeof apmTransactionErrorRateIndicatorSchema
>;
type APMTransactionDurationIndicatorSchema = t.TypeOf<typeof apmTransactionDurationIndicatorSchema>;

export {
  createSLOParamsSchema,
  deleteSLOParamsSchema,
  findSLOParamsSchema,
  findSLOResponseSchema,
  getSLODiagnosisParamsSchema,
  getSLOParamsSchema,
  getSLOResponseSchema,
  fetchHistoricalSummaryParamsSchema,
  fetchHistoricalSummaryResponseSchema,
  manageSLOParamsSchema,
  sloResponseSchema,
  sloWithSummaryResponseSchema,
  updateSLOParamsSchema,
  updateSLOResponseSchema,
};
export type {
  BudgetingMethod,
  CreateSLOInput,
  CreateSLOParams,
  CreateSLOResponse,
  FindSLOParams,
  FindSLOResponse,
  GetSLOResponse,
  FetchHistoricalSummaryParams,
  FetchHistoricalSummaryResponse,
  HistoricalSummaryResponse,
  ManageSLOParams,
  SLOResponse,
  SLOWithSummaryResponse,
  UpdateSLOInput,
  UpdateSLOParams,
  UpdateSLOResponse,
  MetricCustomIndicatorSchema,
  KQLCustomIndicatorSchema,
  APMTransactionDurationIndicatorSchema,
  APMTransactionErrorRateIndicatorSchema,
};
