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
  ReportWorkflowAccessDeniedLicenseActionParams,
  ReportWorkflowAccessDeniedPrivilegesActionParams,
  ReportWorkflowAccessDeniedServerlessTierActionParams,
  ReportWorkflowCreateOpenedActionParams,
  ReportWorkflowDetailViewedActionParams,
  ReportWorkflowExecutionsDetailOpenedActionParams,
  ReportWorkflowExecutionsFilterAppliedActionParams,
  ReportWorkflowExecutionsOpenInEditorClickedActionParams,
  ReportWorkflowExecutionsPageViewedActionParams,
  ReportWorkflowExecutionsSearchUsedActionParams,
  ReportWorkflowExecutionsStepExpandedActionParams,
  ReportWorkflowListViewedActionParams,
} from './types';
import { WorkflowUIEventTypes } from './types';
import type { WorkflowEditorType } from '../types';

export const workflowUIEventNames = {
  [WorkflowUIEventTypes.WorkflowListViewed]: 'Workflow list viewed',
  [WorkflowUIEventTypes.WorkflowDetailViewed]: 'Workflow detail viewed',
  [WorkflowUIEventTypes.WorkflowCreateOpened]: 'Workflow create opened',
  [WorkflowUIEventTypes.WorkflowAccessDeniedPrivileges]: 'Workflow access with missing privileges',
  [WorkflowUIEventTypes.WorkflowAccessDeniedLicense]: 'Workflow access with invalid license',
  [WorkflowUIEventTypes.WorkflowAccessDeniedServerlessTier]:
    'Workflow access with invalid serverless tier',
  [WorkflowUIEventTypes.WorkflowExecutionsPageViewed]: 'Workflow executions page viewed',
  [WorkflowUIEventTypes.WorkflowExecutionsFilterApplied]: 'Workflow executions filter applied',
  [WorkflowUIEventTypes.WorkflowExecutionsSearchUsed]: 'Workflow executions search used',
  [WorkflowUIEventTypes.WorkflowExecutionsDetailOpened]: 'Workflow execution detail opened',
  [WorkflowUIEventTypes.WorkflowExecutionsStepExpanded]: 'Workflow execution step expanded',
  [WorkflowUIEventTypes.WorkflowExecutionsOpenInEditorClicked]:
    'Workflow execution open in editor clicked',
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
        'The editor type(s) visible/active when the action was performed. Only present when viewing workflow/editor tab. Can be: yaml, visual, both, or execution_graph.',
      optional: true,
    },
  },
};

const workflowListViewedSchema: RootSchema<ReportWorkflowListViewedActionParams> = {
  ...eventNameSchema,
  workflowCount: {
    type: 'integer',
    _meta: {
      description: 'Number of workflows in the list',
      optional: false,
    },
  },
  pageNumber: {
    type: 'integer',
    _meta: {
      description: 'The page number being viewed',
      optional: false,
    },
  },
  filterTypes: {
    type: 'array',
    items: { type: 'keyword', _meta: { description: 'Filter type', optional: false } },
    _meta: {
      description:
        "Types of filters/search applied (e.g., 'query', 'enabled', 'createdBy'). Includes 'query' when a search query is used.",
      optional: true,
    },
  },
};

const workflowDetailViewedSchema: RootSchema<ReportWorkflowDetailViewedActionParams> = {
  ...eventNameSchema,
  ...editorTypeSchema,
  workflowId: {
    type: 'keyword',
    _meta: {
      description: 'The workflow ID being viewed',
      optional: false,
    },
  },
  tab: {
    type: 'keyword',
    _meta: {
      description: 'The active tab on the detail page: workflow, executions, or logs',
      optional: false,
    },
  },
};

const workflowCreateOpenedSchema: RootSchema<ReportWorkflowCreateOpenedActionParams> = {
  ...eventNameSchema,
  ...editorTypeSchema,
};

const workflowAccessDeniedPrivilegesSchema: RootSchema<ReportWorkflowAccessDeniedPrivilegesActionParams> =
  { ...eventNameSchema };

const workflowAccessDeniedLicenseSchema: RootSchema<ReportWorkflowAccessDeniedLicenseActionParams> =
  { ...eventNameSchema };

const workflowAccessDeniedServerlessTierSchema: RootSchema<ReportWorkflowAccessDeniedServerlessTierActionParams> =
  { ...eventNameSchema };

const workflowExecutionsPageViewedSchema: RootSchema<ReportWorkflowExecutionsPageViewedActionParams> =
  { ...eventNameSchema };

const workflowExecutionsFilterAppliedSchema: RootSchema<ReportWorkflowExecutionsFilterAppliedActionParams> =
  {
    ...eventNameSchema,
    filterTypes: {
      type: 'array',
      items: {
        type: 'keyword',
        _meta: { description: 'Active filter slot name', optional: false },
      },
      _meta: {
        description:
          "Active filter slots on submission, e.g. ['status', 'workflowId', 'timeRange', 'query'].",
        optional: false,
      },
    },
  };

const workflowExecutionsSearchUsedSchema: RootSchema<ReportWorkflowExecutionsSearchUsedActionParams> =
  {
    ...eventNameSchema,
    hasQuery: {
      type: 'boolean',
      _meta: { description: 'Whether a non-empty KQL query was submitted', optional: false },
    },
  };

const workflowExecutionsDetailOpenedSchema: RootSchema<ReportWorkflowExecutionsDetailOpenedActionParams> =
  {
    ...eventNameSchema,
    executionId: {
      type: 'keyword',
      _meta: { description: 'The execution ID whose detail flyout was opened', optional: false },
    },
  };

const workflowExecutionsStepExpandedSchema: RootSchema<ReportWorkflowExecutionsStepExpandedActionParams> =
  {
    ...eventNameSchema,
    stepType: {
      type: 'keyword',
      _meta: { description: 'The step type of the expanded tree node', optional: false },
    },
  };

const workflowExecutionsOpenInEditorClickedSchema: RootSchema<ReportWorkflowExecutionsOpenInEditorClickedActionParams> =
  {
    ...eventNameSchema,
    workflowId: {
      type: 'keyword',
      _meta: { description: 'The workflow ID to open in the editor', optional: false },
    },
    origin: {
      type: 'keyword',
      _meta: {
        description:
          "Where the click originated: 'table_actions' (row action menu) or 'flyout_actions' (flyout footer)",
        optional: false,
      },
    },
  };

export const workflowUIEventSchemas = {
  [WorkflowUIEventTypes.WorkflowListViewed]: workflowListViewedSchema,
  [WorkflowUIEventTypes.WorkflowDetailViewed]: workflowDetailViewedSchema,
  [WorkflowUIEventTypes.WorkflowCreateOpened]: workflowCreateOpenedSchema,
  [WorkflowUIEventTypes.WorkflowAccessDeniedPrivileges]: workflowAccessDeniedPrivilegesSchema,
  [WorkflowUIEventTypes.WorkflowAccessDeniedLicense]: workflowAccessDeniedLicenseSchema,
  [WorkflowUIEventTypes.WorkflowAccessDeniedServerlessTier]:
    workflowAccessDeniedServerlessTierSchema,
  [WorkflowUIEventTypes.WorkflowExecutionsPageViewed]: workflowExecutionsPageViewedSchema,
  [WorkflowUIEventTypes.WorkflowExecutionsFilterApplied]: workflowExecutionsFilterAppliedSchema,
  [WorkflowUIEventTypes.WorkflowExecutionsSearchUsed]: workflowExecutionsSearchUsedSchema,
  [WorkflowUIEventTypes.WorkflowExecutionsDetailOpened]: workflowExecutionsDetailOpenedSchema,
  [WorkflowUIEventTypes.WorkflowExecutionsStepExpanded]: workflowExecutionsStepExpandedSchema,
  [WorkflowUIEventTypes.WorkflowExecutionsOpenInEditorClicked]:
    workflowExecutionsOpenInEditorClickedSchema,
};
