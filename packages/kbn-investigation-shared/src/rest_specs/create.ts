/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as t from 'io-ts';
import { investigationResponseSchema } from './investigation';
import { alertOriginSchema, blankOriginSchema } from '../schema';

const createInvestigationParamsSchema = t.type({
  body: t.type({
    id: t.string,
    title: t.string,
    params: t.type({
      timeRange: t.type({ from: t.number, to: t.number }),
    }),
    origin: t.union([alertOriginSchema, blankOriginSchema]),
  }),
});

const createInvestigationResponseSchema = investigationResponseSchema;

type CreateInvestigationParams = t.TypeOf<typeof createInvestigationParamsSchema.props.body>;
type CreateInvestigationResponse = t.OutputOf<typeof createInvestigationResponseSchema>;

export { createInvestigationParamsSchema, createInvestigationResponseSchema };
export type { CreateInvestigationParams, CreateInvestigationResponse };
