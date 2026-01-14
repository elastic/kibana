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
  WorkflowLifecycleEventTypes,
} from './types';
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
        'The editor type(s) visible/active when the action was performed. Only present when action originates from workflow detail page. Can be: yaml, visual, both, or execution_graph.',
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
  stepCount: {
    type: 'integer',
    _meta: {
      description: 'Total number of steps in the workflow (including nested steps)',
      optional: true,
    },
  },
  connectorTypes: {
    type: 'keyword',
    _meta: {
      description: 'Unique connector types used in the workflow',
      optional: true,
    },
  },
  stepTypeCounts: {
    type: 'pass_through',
    _meta: {
      description:
        'Count of steps by step type (e.g., { "foreach": 2, "slack.webhook": 5, "if": 1 })',
      optional: true,
    },
  },
  hasScheduledTriggers: {
    type: 'boolean',
    _meta: {
      description: 'Whether the workflow has scheduled triggers',
      optional: true,
    },
  },
  hasAlertTriggers: {
    type: 'boolean',
    _meta: {
      description: 'Whether the workflow has alert triggers',
      optional: true,
    },
  },
  hasTimeout: {
    type: 'boolean',
    _meta: {
      description: 'Whether the workflow has a timeout configured',
      optional: true,
    },
  },
  hasConcurrency: {
    type: 'boolean',
    _meta: {
      description: 'Whether the workflow has concurrency settings configured',
      optional: true,
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
  hasOnFailure: {
    type: 'boolean',
    _meta: {
      description: 'Whether the workflow has on-failure handling configured',
      optional: true,
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
  updateType: {
    type: 'keyword',
    _meta: {
      description: 'The type of update: yaml, metadata, enabled, tags, or description',
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
    type: 'keyword',
    _meta: {
      description:
        'Types of validation errors encountered (e.g., schema_error, step_name_duplicate)',
      optional: true,
    },
  },
};

const workflowDeletedSchema: RootSchema<ReportWorkflowDeletedActionParams> = {
  ...baseResultActionSchema,
  ...eventNameSchema,
  workflowIds: {
    type: 'keyword',
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
  };

export const workflowLifecycleEventSchemas = {
  [WorkflowLifecycleEventTypes.WorkflowCreated]: workflowCreatedSchema,
  [WorkflowLifecycleEventTypes.WorkflowUpdated]: workflowUpdatedSchema,
  [WorkflowLifecycleEventTypes.WorkflowDeleted]: workflowDeletedSchema,
  [WorkflowLifecycleEventTypes.WorkflowCloned]: workflowClonedSchema,
  [WorkflowLifecycleEventTypes.WorkflowEnabledStateChanged]: workflowEnabledStateChangedSchema,
};
