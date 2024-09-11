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

const updateInvestigationParamsSchema = t.type({
  path: t.type({
    investigationId: t.string,
  }),
  body: t.partial({
    title: t.string,
    status: t.union([t.literal('ongoing'), t.literal('closed')]),
    params: t.type({
      timeRange: t.type({ from: t.number, to: t.number }),
    }),
  }),
});

const updateInvestigationResponseSchema = investigationResponseSchema;

type UpdateInvestigationParams = t.TypeOf<typeof updateInvestigationParamsSchema.props.body>;
type UpdateInvestigationResponse = t.OutputOf<typeof updateInvestigationResponseSchema>;

export { updateInvestigationParamsSchema, updateInvestigationResponseSchema };
export type { UpdateInvestigationParams, UpdateInvestigationResponse };
