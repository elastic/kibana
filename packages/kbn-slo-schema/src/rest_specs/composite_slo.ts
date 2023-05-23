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
  combinedSlo,
  compositeSloIdSchema,
  rollingTimeWindowSchema,
  sloIdSchema,
  tagsSchema,
  targetSchema,
} from '../schema';

const createCompositeSLOParamsSchema = t.type({
  body: t.intersection([
    t.type({
      name: t.string,
      timeWindow: rollingTimeWindowSchema,
      budgetingMethod: budgetingMethodSchema,
      objective: targetSchema,
      combinedSlos: t.array(combinedSlo),
    }),
    t.partial({ id: compositeSloIdSchema, tags: tagsSchema }),
  ]),
});

const createCompositeSLOResponseSchema = t.type({
  id: sloIdSchema,
});

type CreateCompositeSLOInput = t.OutputOf<typeof createCompositeSLOParamsSchema.props.body>; // Raw payload sent by the frontend
type CreateCompositeSLOParams = t.TypeOf<typeof createCompositeSLOParamsSchema.props.body>; // Parsed payload used by the backend
type CreateCompositeSLOResponse = t.TypeOf<typeof createCompositeSLOResponseSchema>; // Raw response sent to the frontend

export type { CreateCompositeSLOInput, CreateCompositeSLOParams, CreateCompositeSLOResponse };
