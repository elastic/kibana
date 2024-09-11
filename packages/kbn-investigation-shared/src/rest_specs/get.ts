/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as t from 'io-ts';
import { investigationResponseSchema } from './investigation';

const getInvestigationParamsSchema = t.type({
  path: t.type({
    investigationId: t.string,
  }),
});

const getInvestigationResponseSchema = investigationResponseSchema;

type GetInvestigationParams = t.TypeOf<typeof getInvestigationParamsSchema.props.path>; // Parsed payload used by the backend
type GetInvestigationResponse = t.OutputOf<typeof getInvestigationResponseSchema>; // Raw response sent to the frontend

export { getInvestigationParamsSchema, getInvestigationResponseSchema };
export type { GetInvestigationParams, GetInvestigationResponse };
