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
  ReportWorkflowRunInitiatedActionParams,
  ReportWorkflowStepTestRunInitiatedActionParams,
  ReportWorkflowTestRunInitiatedActionParams,
  WorkflowExecutionEventTypes,
} from './types';
import type { BaseResultActionParams, WorkflowEditorType } from '../types';

export const workflowExecutionEventNames = {
  [WorkflowExecutionEventTypes.WorkflowTestRunInitiated]: 'Workflow test run initiated',
  [WorkflowExecutionEventTypes.WorkflowStepTestRunInitiated]: 'Workflow step test run initiated',
  [WorkflowExecutionEventTypes.WorkflowRunInitiated]: 'Workflow run initiated',
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

const workflowTestRunInitiatedSchema: RootSchema<ReportWorkflowTestRunInitiatedActionParams> = {
  ...baseResultActionSchema,
  ...eventNameSchema,
  ...editorTypeSchema,
  workflowId: {
    type: 'keyword',
    _meta: {
      description:
        'The workflow ID if test run is for existing workflow. Undefined for new workflows.',
      optional: true,
    },
  },
  hasInputs: {
    type: 'boolean',
    _meta: {
      description: 'Whether the test run has inputs',
      optional: false,
    },
  },
  inputCount: {
    type: 'integer',
    _meta: {
      description: 'Number of inputs provided',
      optional: false,
    },
  },
};

const workflowStepTestRunInitiatedSchema: RootSchema<ReportWorkflowStepTestRunInitiatedActionParams> =
  {
    ...baseResultActionSchema,
    ...eventNameSchema,
    ...editorTypeSchema,
    workflowId: {
      type: 'keyword',
      _meta: {
        description:
          'The workflow ID if step test is for existing workflow. Undefined for new workflows.',
        optional: true,
      },
    },
    stepId: {
      type: 'keyword',
      _meta: {
        description: 'The step ID being tested',
        optional: false,
      },
    },
    stepType: {
      type: 'keyword',
      _meta: {
        description: 'The type of step being tested (e.g., connector, if, foreach)',
        optional: false,
      },
    },
    connectorType: {
      type: 'keyword',
      _meta: {
        description: 'The connector type if step uses a connector',
        optional: true,
      },
    },
  };

const workflowRunInitiatedSchema: RootSchema<ReportWorkflowRunInitiatedActionParams> = {
  ...baseResultActionSchema,
  ...eventNameSchema,
  ...editorTypeSchema,
  workflowId: {
    type: 'keyword',
    _meta: {
      description: 'The workflow ID',
      optional: false,
    },
  },
  hasInputs: {
    type: 'boolean',
    _meta: {
      description: 'Whether the run has inputs',
      optional: false,
    },
  },
  inputCount: {
    type: 'integer',
    _meta: {
      description: 'Number of inputs provided',
      optional: false,
    },
  },
};

export const workflowExecutionEventSchemas = {
  [WorkflowExecutionEventTypes.WorkflowTestRunInitiated]: workflowTestRunInitiatedSchema,
  [WorkflowExecutionEventTypes.WorkflowStepTestRunInitiated]: workflowStepTestRunInitiatedSchema,
  [WorkflowExecutionEventTypes.WorkflowRunInitiated]: workflowRunInitiatedSchema,
};
