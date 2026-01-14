/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { RootSchema } from '@kbn/core/public';
import type {
  ReportWorkflowValidationErrorActionParams,
  WorkflowValidationEventTypes,
} from './types';
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
  errorType: {
    type: 'keyword',
    _meta: {
      description:
        'The type of validation error: schema, step_name_duplicate, invalid_yaml, missing_connector, invalid_step_config, or other',
      optional: false,
    },
  },
  errorMessage: {
    type: 'text',
    _meta: {
      description: 'The validation error message',
      optional: false,
    },
  },
};

export const workflowValidationEventSchemas = {
  [WorkflowValidationEventTypes.WorkflowValidationError]: workflowValidationErrorSchema,
};
