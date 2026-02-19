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
  ReportWorkflowDetailViewedActionParams,
  ReportWorkflowListViewedActionParams,
} from './types';
import { WorkflowUIEventTypes } from './types';
import type { WorkflowEditorType } from '../types';

export const workflowUIEventNames = {
  [WorkflowUIEventTypes.WorkflowListViewed]: 'Workflow list viewed',
  [WorkflowUIEventTypes.WorkflowDetailViewed]: 'Workflow detail viewed',
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

export const workflowUIEventSchemas = {
  [WorkflowUIEventTypes.WorkflowListViewed]: workflowListViewedSchema,
  [WorkflowUIEventTypes.WorkflowDetailViewed]: workflowDetailViewedSchema,
};
