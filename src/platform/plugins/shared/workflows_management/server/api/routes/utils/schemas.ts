/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import { MAX_WORKFLOW_ENTITY_ID_LENGTH } from './route_constants';
import { ES_MAX_RESULT_WINDOW } from '../../../lib/workflow_history_pagination_error';

export const idParamSchema = schema.object({
  id: schema.string({
    maxLength: MAX_WORKFLOW_ENTITY_ID_LENGTH,
    meta: { description: 'Workflow ID' },
  }),
});

export const executionIdParamSchema = schema.object({
  executionId: schema.string({
    maxLength: MAX_WORKFLOW_ENTITY_ID_LENGTH,
    meta: { description: 'Workflow execution ID' },
  }),
});

export const workflowIdParamSchema = schema.object({
  workflowId: schema.string({
    maxLength: MAX_WORKFLOW_ENTITY_ID_LENGTH,
    meta: { description: 'Workflow ID' },
  }),
});

/** Rejects `page * size` past the ES result window; `defaultSize` applies when `size` is omitted. */
export const validatePaginationWindow =
  (defaultSize: number) =>
  ({ page, size }: { page?: number; size?: number }): string | undefined => {
    if (page !== undefined && page * (size ?? defaultSize) > ES_MAX_RESULT_WINDOW) {
      return `page * size must not exceed ${ES_MAX_RESULT_WINDOW}`;
    }
  };
