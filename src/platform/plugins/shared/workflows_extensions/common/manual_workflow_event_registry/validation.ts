/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { MANUAL_WORKFLOW_EVENT_TYPE_MAX_LENGTH } from '@kbn/workflows';
import type { z } from '@kbn/zod/v4';
import type { ManualWorkflowEventDefinition } from './types';

const MANUAL_WORKFLOW_EVENT_ID_REGEX = /^[a-zA-Z0-9-]+\.[a-zA-Z0-9.]+$/;

const isZodObject = (schema: z.ZodType): schema is z.ZodObject<z.ZodRawShape> =>
  typeof schema === 'object' && schema !== null && 'shape' in schema;

export const validateManualWorkflowEventDefinition = (
  definition: ManualWorkflowEventDefinition
): void => {
  const { id, eventSchema, title, description } = definition;

  if (typeof id !== 'string' || id.length === 0) {
    throw new Error('Manual workflow event definition "id" must be a non-empty string.');
  }
  if (id.length > MANUAL_WORKFLOW_EVENT_TYPE_MAX_LENGTH) {
    throw new Error(
      `Manual workflow event definition "id" must not exceed ${MANUAL_WORKFLOW_EVENT_TYPE_MAX_LENGTH} characters.`
    );
  }
  if (!MANUAL_WORKFLOW_EVENT_ID_REGEX.test(id)) {
    throw new Error(
      `Manual workflow event id "${id}" must follow namespaced format <namespace>.<event> (for example, "cases.updated").`
    );
  }
  if (!eventSchema || typeof eventSchema.safeParse !== 'function') {
    throw new Error(`Manual workflow event "${id}": "eventSchema" must be a Zod schema.`);
  }
  if (!isZodObject(eventSchema)) {
    throw new Error(
      `Manual workflow event "${id}": "eventSchema" must be a Zod object schema (for example, z.object({...})).`
    );
  }
  if (typeof title !== 'string' || title.length === 0) {
    throw new Error(`Manual workflow event "${id}": "title" must be a non-empty string.`);
  }
  if (typeof description !== 'string' || description.length === 0) {
    throw new Error(`Manual workflow event "${id}": "description" must be a non-empty string.`);
  }
};
