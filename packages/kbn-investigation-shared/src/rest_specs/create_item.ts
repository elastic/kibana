/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as t from 'io-ts';
import { investigationItemsSchema } from '../schema';
import { investigationItemResponseSchema } from './investigation_item';

const createInvestigationItemParamsSchema = t.type({
  path: t.type({
    investigationId: t.string,
  }),
  body: investigationItemsSchema,
});

const createInvestigationItemResponseSchema = investigationItemResponseSchema;

type CreateInvestigationItemParams = t.TypeOf<
  typeof createInvestigationItemParamsSchema.props.body
>;
type CreateInvestigationItemResponse = t.OutputOf<typeof createInvestigationItemResponseSchema>;

export { createInvestigationItemParamsSchema, createInvestigationItemResponseSchema };
export type { CreateInvestigationItemParams, CreateInvestigationItemResponse };
