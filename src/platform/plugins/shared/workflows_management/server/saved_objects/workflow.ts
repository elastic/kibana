/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { SavedObjectsType } from '@kbn/core/server';
import { WorkflowStatus, WorkflowYaml } from '@kbn/workflows';

export const WORKFLOW_SAVED_OBJECT_TYPE = 'workflow';

export interface WorkflowSavedObjectAttributes {
  name: string;
  description?: string;
  status: WorkflowStatus;
  tags: string[];
  yaml: string;
  definition: WorkflowYaml;
  createdBy: string;
  lastUpdatedBy: string;
}

export const workflowSavedObjectType: SavedObjectsType<WorkflowSavedObjectAttributes> = {
  name: WORKFLOW_SAVED_OBJECT_TYPE,
  hidden: false,
  namespaceType: 'multiple-isolated',
  mappings: {
    dynamic: false,
    properties: {
      name: {
        type: 'text',
        fields: {
          keyword: {
            type: 'keyword',
            ignore_above: 256,
          },
        },
      },
      description: {
        type: 'text',
        fields: {
          keyword: {
            type: 'keyword',
            ignore_above: 256,
          },
        },
      },
      status: {
        type: 'keyword',
      },
      tags: {
        type: 'keyword',
      },
      yaml: {
        type: 'text',
        index: false,
      },
      definition: {
        type: 'object',
        enabled: false,
      },
      createdBy: {
        type: 'keyword',
      },
      lastUpdatedBy: {
        type: 'keyword',
      },
    },
  },
  management: {
    importableAndExportable: true,
    visibleInManagement: true,
    getTitle: (obj) => obj.attributes.name,
    getEditUrl: (obj) => `/workflows/${obj.id}`,
    getInAppUrl: (obj) => ({
      path: `/workflows/${obj.id}`,
      uiCapabilitiesPath: 'workflows.read',
    }),
  },
  modelVersions: {
    1: {
      changes: [],
    },
  },
};
