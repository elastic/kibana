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
  ReportWorkflowClonedActionParams,
  ReportWorkflowCreatedActionParams,
  ReportWorkflowDeletedActionParams,
  ReportWorkflowEnabledStateChangedActionParams,
  ReportWorkflowUpdatedActionParams,
} from './types';
import { WorkflowLifecycleEventTypes } from './types';
import type { BaseResultActionParams, WorkflowEditorType } from '../types';

export const workflowLifecycleEventNames = {
  [WorkflowLifecycleEventTypes.WorkflowCreated]: 'Workflow created',
  [WorkflowLifecycleEventTypes.WorkflowUpdated]: 'Workflow updated',
  [WorkflowLifecycleEventTypes.WorkflowDeleted]: 'Workflow deleted',
  [WorkflowLifecycleEventTypes.WorkflowCloned]: 'Workflow cloned',
  [WorkflowLifecycleEventTypes.WorkflowEnabledStateChanged]: 'Workflow enabled state changed',
};

const baseResultActionSchema: RootSchema<BaseResultActionParams> = {
  result: {
    type: 'keyword',
    _meta: {
      description:
        'Indicates whether the action/request succeeded or failed. Can be one of `success` or `failed`. This event tracks the attempt, not just successful outcomes.',
      optional: false,
    },
  },
  errorMessage: {
    type: 'text',
    _meta: {
      description:
        'The error message if the action/request failed. Only present when result is `failed`.',
      optional: true,
    },
  },
  origin: {
    type: 'keyword',
    _meta: {
      description: 'Origin of the action: workflow_list or workflow_detail',
      optional: true,
    },
  },
};

const eventNameSchema: RootSchema<{ eventName: string }> = {
  eventName: {
    type: 'keyword',
    _meta: {
      description: 'The event name/description',
      optional: false,
    },
  },
};

const editorTypeSchema: RootSchema<{ editorType?: WorkflowEditorType }> = {
  editorType: {
    type: 'keyword',
    _meta: {
      description:
        'The editor type(s) visible/active when the action was performed. Only present when action originates from workflow detail page. Can be: yaml, visual, both, execution_graph, or ui.',
      optional: true,
    },
  },
};

const workflowIdSchema: RootSchema<{ workflowId?: string }> = {
  workflowId: {
    type: 'keyword',
    _meta: {
      description: 'Workflow ID if creation succeeded. Undefined if creation failed.',
      optional: true,
    },
  },
};

const workflowCreatedSchema: RootSchema<ReportWorkflowCreatedActionParams> = {
  ...baseResultActionSchema,
  ...eventNameSchema,
  ...workflowIdSchema,
  ...editorTypeSchema,
  enabled: {
    type: 'boolean',
    _meta: {
      description: 'Whether the workflow is enabled',
      optional: false,
    },
  },
  stepCount: {
    type: 'integer',
    _meta: {
      description: 'Total number of steps in the workflow (including nested steps)',
      optional: false,
    },
  },
  connectorTypes: {
    type: 'array',
    items: { type: 'keyword', _meta: { description: 'Connector type', optional: false } },
    _meta: {
      description: 'Unique connector types used in the workflow',
      optional: false,
    },
  },
  stepTypes: {
    type: 'array',
    items: { type: 'keyword', _meta: { description: 'Step type', optional: false } },
    _meta: {
      description:
        'Unique step types used in the workflow (e.g., ["foreach", "if", "console"]). Enables easy aggregation in dashboards.',
      optional: false,
    },
  },
  stepTypeCounts: {
    type: 'pass_through',
    _meta: {
      description:
        'Count of steps by step type (e.g., { "foreach": 2, "slack.webhook": 5, "if": 1 })',
      optional: false,
    },
  },
  triggerTypes: {
    type: 'array',
    items: { type: 'keyword', _meta: { description: 'Trigger type', optional: false } },
    _meta: {
      description:
        'Trigger types configured in the workflow (e.g., ["scheduled", "alert", "index"]). Enables easy aggregation in dashboards.',
      optional: false,
    },
  },
  concurrencyMax: {
    type: 'integer',
    _meta: {
      description: 'Maximum concurrent runs if concurrency is configured',
      optional: true,
    },
  },
  concurrencyStrategy: {
    type: 'keyword',
    _meta: {
      description:
        "Concurrency strategy if concurrency is configured ('queue', 'drop', or 'cancel-in-progress')",
      optional: true,
    },
  },
  settingsUsed: {
    type: 'array',
    items: { type: 'keyword', _meta: { description: 'Setting name', optional: false } },
    _meta: {
      description:
        'Settings configured in the workflow (e.g., ["timeout", "concurrency", "on-failure"]). Enables easy aggregation in dashboards.',
      optional: false,
    },
  },
  hasDescription: {
    type: 'boolean',
    _meta: {
      description: 'Whether the workflow has a description',
      optional: false,
    },
  },
  tagCount: {
    type: 'integer',
    _meta: {
      description: 'Number of tags assigned to the workflow',
      optional: false,
    },
  },
  constCount: {
    type: 'integer',
    _meta: {
      description: 'Number of constants defined in the workflow',
      optional: false,
    },
  },
};

const workflowUpdatedSchema: RootSchema<ReportWorkflowUpdatedActionParams> = {
  ...baseResultActionSchema,
  ...eventNameSchema,
  ...editorTypeSchema,
  workflowId: {
    type: 'keyword',
    _meta: {
      description: 'The workflow ID being updated',
      optional: false,
    },
  },
  hasValidationErrors: {
    type: 'boolean',
    _meta: {
      description: 'Whether the update resulted in validation errors',
      optional: false,
    },
  },
  validationErrorCount: {
    type: 'integer',
    _meta: {
      description: 'Number of validation errors (0 if none)',
      optional: false,
    },
  },
  validationErrorTypes: {
    type: 'array',
    items: { type: 'keyword', _meta: { description: 'Error type', optional: false } },
    _meta: {
      description:
        'Types of validation errors encountered (e.g., schema_error, step_name_duplicate)',
      optional: true,
    },
  },
  updatedFields: {
    type: 'array',
    items: { type: 'keyword', _meta: { description: 'Field name', optional: false } },
    _meta: {
      description:
        'List of field names that were updated (e.g., yaml, name, description, tags). Note: enabled changes are reported in a separate event.',
      optional: true,
    },
  },
};

const workflowDeletedSchema: RootSchema<ReportWorkflowDeletedActionParams> = {
  ...baseResultActionSchema,
  ...eventNameSchema,
  workflowIds: {
    type: 'array',
    items: { type: 'keyword', _meta: { description: 'Workflow ID', optional: false } },
    _meta: {
      description: 'The workflow IDs being deleted',
      optional: false,
    },
  },
  isBulkDelete: {
    type: 'boolean',
    _meta: {
      description: 'Whether this is a bulk delete operation',
      optional: false,
    },
  },
};

const workflowClonedSchema: RootSchema<ReportWorkflowClonedActionParams> = {
  ...baseResultActionSchema,
  ...eventNameSchema,
  ...editorTypeSchema,
  sourceWorkflowId: {
    type: 'keyword',
    _meta: {
      description: 'The source workflow ID being cloned',
      optional: false,
    },
  },
  newWorkflowId: {
    type: 'keyword',
    _meta: {
      description: 'The new workflow ID if clone succeeded. Undefined if clone failed.',
      optional: true,
    },
  },
};

const workflowEnabledStateChangedSchema: RootSchema<ReportWorkflowEnabledStateChangedActionParams> =
  {
    ...baseResultActionSchema,
    ...eventNameSchema,
    ...editorTypeSchema,
    workflowId: {
      type: 'keyword',
      _meta: {
        description: 'The workflow ID whose enabled state is being changed',
        optional: false,
      },
    },
    enabled: {
      type: 'boolean',
      _meta: {
        description: 'The new enabled state (true = enabled, false = disabled)',
        optional: false,
      },
    },
    isBulkAction: {
      type: 'boolean',
      _meta: {
        description: 'Whether this is a bulk operation',
        optional: false,
      },
    },
    bulkActionCount: {
      type: 'integer',
      _meta: {
        description:
          'Number of workflows in the bulk action (only present when isBulkAction is true)',
        optional: true,
      },
    },
    origin: {
      type: 'keyword',
      _meta: {
        description: 'Origin of the update action: workflow_list or workflow_detail',
        optional: true,
      },
    },
  };

export const workflowLifecycleEventSchemas = {
  [WorkflowLifecycleEventTypes.WorkflowCreated]: workflowCreatedSchema,
  [WorkflowLifecycleEventTypes.WorkflowUpdated]: workflowUpdatedSchema,
  [WorkflowLifecycleEventTypes.WorkflowDeleted]: workflowDeletedSchema,
  [WorkflowLifecycleEventTypes.WorkflowCloned]: workflowClonedSchema,
  [WorkflowLifecycleEventTypes.WorkflowEnabledStateChanged]: workflowEnabledStateChangedSchema,
};
