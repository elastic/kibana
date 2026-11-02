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
  ReportWorkflowExportedActionParams,
  ReportWorkflowImportedActionParams,
} from './types';
import { WorkflowImportExportEventTypes } from './types';
import type { BaseResultActionParams } from '../types';

export const workflowImportExportEventNames = {
  [WorkflowImportExportEventTypes.WorkflowExported]: 'Workflow exported',
  [WorkflowImportExportEventTypes.WorkflowImported]: 'Workflow imported',
};

const baseResultActionSchema: RootSchema<BaseResultActionParams> = {
  result: {
    type: 'keyword',
    _meta: {
      description:
        'Indicates whether the action/request succeeded or failed. Can be one of `success` or `failed`.',
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

const workflowExportedSchema: RootSchema<ReportWorkflowExportedActionParams> = {
  ...baseResultActionSchema,
  ...eventNameSchema,
  workflowCount: {
    type: 'integer',
    _meta: {
      description: 'Number of workflows exported',
      optional: false,
    },
  },
  format: {
    type: 'keyword',
    _meta: {
      description: 'Export format: yaml (single) or zip (multiple)',
      optional: false,
    },
  },
  referenceResolution: {
    type: 'keyword',
    _meta: {
      description: 'How workflow references were resolved: none, ignore, add_direct, or add_all',
      optional: false,
    },
  },
};

const workflowImportedSchema: RootSchema<ReportWorkflowImportedActionParams> = {
  ...baseResultActionSchema,
  ...eventNameSchema,
  workflowCount: {
    type: 'integer',
    _meta: {
      description: 'Total number of workflows in the import file',
      optional: false,
    },
  },
  format: {
    type: 'keyword',
    _meta: {
      description: 'Import file format: yaml or zip',
      optional: false,
    },
  },
  conflictResolution: {
    type: 'keyword',
    _meta: {
      description: 'Conflict resolution strategy: generateNewIds or overwrite',
      optional: false,
    },
  },
  hasConflicts: {
    type: 'boolean',
    _meta: {
      description: 'Whether any ID conflicts were detected during preflight',
      optional: false,
    },
  },
  successCount: {
    type: 'integer',
    _meta: {
      description: 'Number of workflows successfully imported',
      optional: false,
    },
  },
  failedCount: {
    type: 'integer',
    _meta: {
      description: 'Number of workflows that failed to import',
      optional: false,
    },
  },
  minStepCount: {
    type: 'integer',
    _meta: {
      description: 'Minimum step count across all imported workflows',
      optional: false,
    },
  },
  maxStepCount: {
    type: 'integer',
    _meta: {
      description: 'Maximum step count across all imported workflows',
      optional: false,
    },
  },
  minTriggerCount: {
    type: 'integer',
    _meta: {
      description: 'Minimum trigger count across all imported workflows',
      optional: false,
    },
  },
  maxTriggerCount: {
    type: 'integer',
    _meta: {
      description: 'Maximum trigger count across all imported workflows',
      optional: false,
    },
  },
};

export const workflowImportExportEventSchemas = {
  [WorkflowImportExportEventTypes.WorkflowExported]: workflowExportedSchema,
  [WorkflowImportExportEventTypes.WorkflowImported]: workflowImportedSchema,
};
