/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as t from 'io-ts';
import { investigationItemResponseSchema } from './investigation_item';

const getInvestigationItemsParamsSchema = t.type({
  path: t.type({
    investigationId: t.string,
  }),
});

const getInvestigationItemsResponseSchema = t.array(investigationItemResponseSchema);

type GetInvestigationItemsResponse = t.OutputOf<typeof getInvestigationItemsResponseSchema>;

export { getInvestigationItemsParamsSchema, getInvestigationItemsResponseSchema };
export type { GetInvestigationItemsResponse };
