/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as t from 'io-ts';
import { investigationItemResponseSchema } from './investigation_item';
import { itemSchema } from '../schema';

const updateInvestigationItemParamsSchema = t.type({
  path: t.type({
    investigationId: t.string,
    itemId: t.string,
  }),
  body: itemSchema,
});

const updateInvestigationItemResponseSchema = investigationItemResponseSchema;

type UpdateInvestigationItemParams = t.TypeOf<
  typeof updateInvestigationItemParamsSchema.props.body
>;
type UpdateInvestigationItemResponse = t.OutputOf<typeof updateInvestigationItemResponseSchema>;

export { updateInvestigationItemParamsSchema, updateInvestigationItemResponseSchema };
export type { UpdateInvestigationItemParams, UpdateInvestigationItemResponse };
