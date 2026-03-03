/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { RootSchema } from '@kbn/core/public';
import type { ReportWorkflowValidationErrorActionParams } from './types';
import { WorkflowValidationEventTypes } from './types';
import type { WorkflowEditorType } from '../types';

export const workflowValidationEventNames = {
  [WorkflowValidationEventTypes.WorkflowValidationError]: 'Workflow validation error',
};

const editorTypeSchema: RootSchema<{ editorType?: WorkflowEditorType }> = {
  editorType: {
    type: 'keyword',
    _meta: {
      description:
        'The editor type(s) visible/active when the validation error occurred. Only present when error occurred on workflow detail page. Can be: yaml, visual, both, or execution_graph.',
      optional: true,
    },
  },
};

const workflowValidationErrorSchema: RootSchema<ReportWorkflowValidationErrorActionParams> = {
  eventName: {
    type: 'keyword',
    _meta: {
      description: 'The event name/description',
      optional: false,
    },
  },
  ...editorTypeSchema,
  workflowId: {
    type: 'keyword',
    _meta: {
      description:
        'The workflow ID if validation error occurred on existing workflow. Undefined for new workflows.',
      optional: true,
    },
  },
  errorTypes: {
    type: 'array',
    items: {
      type: 'keyword',
      _meta: {
        description: 'A validation error type',
        optional: false,
      },
    },
    _meta: {
      description:
        'Unique validation error types (e.g., ["step-name-validation", "connector-id-validation"])',
      optional: false,
    },
  },
  errorCount: {
    type: 'integer',
    _meta: {
      description: 'Total number of validation errors',
      optional: false,
    },
  },
  origin: {
    type: 'keyword',
    _meta: {
      description:
        'Origin of the action: workflow_list or workflow_detail. Only present when the action originates from a specific page.',
      optional: true,
    },
  },
};

export const workflowValidationEventSchemas = {
  [WorkflowValidationEventTypes.WorkflowValidationError]: workflowValidationErrorSchema,
};
