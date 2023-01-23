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
  summarySchema,
  timeWindowSchema,
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
    t.partial({ settings: optionalSettingsSchema }),
  ]),
});

const createSLOResponseSchema = t.type({
  id: t.string,
});

const deleteSLOParamsSchema = t.type({
  path: t.type({
    id: t.string,
  }),
});

const getSLOParamsSchema = t.type({
  path: t.type({
    id: t.string,
  }),
});

const sortDirectionSchema = t.union([t.literal('asc'), t.literal('desc')]);
const sortBySchema = t.union([t.literal('name'), t.literal('indicatorType')]);

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
  id: t.string,
  name: t.string,
  description: t.string,
  indicator: indicatorSchema,
  timeWindow: timeWindowSchema,
  budgetingMethod: budgetingMethodSchema,
  objective: objectiveSchema,
  revision: t.number,
  settings: settingsSchema,
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
    id: t.string,
  }),
  body: t.partial({
    name: t.string,
    description: t.string,
    indicator: indicatorSchema,
    timeWindow: timeWindowSchema,
    budgetingMethod: budgetingMethodSchema,
    objective: objectiveSchema,
    settings: optionalSettingsSchema,
  }),
});

const updateSLOResponseSchema = sloResponseSchema;

const findSLOResponseSchema = t.type({
  page: t.number,
  perPage: t.number,
  total: t.number,
  results: t.array(sloWithSummaryResponseSchema),
});

const fetchHistoricalSummaryParamsSchema = t.type({ body: t.type({ sloIds: t.array(t.string) }) });
const fetchHistoricalSummaryResponseSchema = t.record(t.string, t.array(historicalSummarySchema));

type SLOResponse = t.OutputOf<typeof sloResponseSchema>;
type SLOWithSummaryResponse = t.OutputOf<typeof sloWithSummaryResponseSchema>;

type CreateSLOInput = t.OutputOf<typeof createSLOParamsSchema.props.body>; // Raw payload sent by the frontend
type CreateSLOParams = t.TypeOf<typeof createSLOParamsSchema.props.body>; // Parsed payload used by the backend
type CreateSLOResponse = t.TypeOf<typeof createSLOResponseSchema>; // Raw response sent to the frontend

type GetSLOResponse = t.OutputOf<typeof getSLOResponseSchema>;

type UpdateSLOInput = t.OutputOf<typeof updateSLOParamsSchema.props.body>;
type UpdateSLOParams = t.TypeOf<typeof updateSLOParamsSchema.props.body>;
type UpdateSLOResponse = t.OutputOf<typeof updateSLOResponseSchema>;

type FindSLOParams = t.TypeOf<typeof findSLOParamsSchema.props.query>;
type FindSLOResponse = t.OutputOf<typeof findSLOResponseSchema>;

type FetchHistoricalSummaryParams = t.TypeOf<typeof fetchHistoricalSummaryParamsSchema.props.body>;
type FetchHistoricalSummaryResponse = t.OutputOf<typeof fetchHistoricalSummaryResponseSchema>;

type BudgetingMethod = t.TypeOf<typeof budgetingMethodSchema>;

export {
  createSLOParamsSchema,
  deleteSLOParamsSchema,
  findSLOParamsSchema,
  findSLOResponseSchema,
  getSLOParamsSchema,
  getSLOResponseSchema,
  fetchHistoricalSummaryParamsSchema,
  fetchHistoricalSummaryResponseSchema,
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
  SLOResponse,
  SLOWithSummaryResponse,
  UpdateSLOInput,
  UpdateSLOParams,
  UpdateSLOResponse,
};
