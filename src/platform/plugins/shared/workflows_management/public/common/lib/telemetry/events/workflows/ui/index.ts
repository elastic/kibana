/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { RootSchema } from '@kbn/core/public';
import type { WorkflowEditorType } from '../types';
import type {
  ReportWorkflowDetailViewedActionParams,
  ReportWorkflowListViewedActionParams,
  ReportWorkflowSearchedActionParams,
  WorkflowUIEventTypes,
} from './types';

export const workflowUIEventNames = {
  [WorkflowUIEventTypes.WorkflowSearched]: 'Workflow searched',
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

const workflowSearchedSchema: RootSchema<ReportWorkflowSearchedActionParams> = {
  ...eventNameSchema,
  hasQuery: {
    type: 'boolean',
    _meta: {
      description: 'Whether a search query was provided',
      optional: false,
    },
  },
  hasFilters: {
    type: 'boolean',
    _meta: {
      description: 'Whether any filters were applied',
      optional: false,
    },
  },
  filterTypes: {
    type: 'keyword',
    _meta: {
      description: 'Types of filters applied (e.g., enabled, createdBy)',
      optional: true,
    },
  },
  resultCount: {
    type: 'integer',
    _meta: {
      description: 'Number of results returned',
      optional: false,
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
  [WorkflowUIEventTypes.WorkflowSearched]: workflowSearchedSchema,
  [WorkflowUIEventTypes.WorkflowListViewed]: workflowListViewedSchema,
  [WorkflowUIEventTypes.WorkflowDetailViewed]: workflowDetailViewedSchema,
};

