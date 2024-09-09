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

const findInvestigationsParamsSchema = t.partial({
  query: t.partial({
    alertId: t.string,
    page: t.string,
    perPage: t.string,
  }),
});

const findInvestigationsResponseSchema = t.type({
  page: t.number,
  perPage: t.number,
  total: t.number,
  results: t.array(investigationResponseSchema),
});

type FindInvestigationsParams = t.TypeOf<typeof findInvestigationsParamsSchema.props.query>;
type FindInvestigationsResponse = t.OutputOf<typeof findInvestigationsResponseSchema>;

export { findInvestigationsParamsSchema, findInvestigationsResponseSchema };
export type { FindInvestigationsParams, FindInvestigationsResponse };
