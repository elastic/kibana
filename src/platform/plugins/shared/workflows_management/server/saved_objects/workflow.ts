/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedObjectsType } from '@kbn/core/server';
import type { WorkflowYaml } from '@kbn/workflows';
import { parseWorkflowYamlToJSON } from '../../common/lib/yaml_utils';
import { WORKFLOW_ZOD_SCHEMA_LOOSE } from '../../common/schema';

export const WORKFLOW_SAVED_OBJECT_TYPE = 'workflow';

export interface WorkflowSavedObjectAttributes {
  name: string;
  description?: string;
  enabled: boolean;
  tags: string[];
  yaml: string;
  definition: WorkflowYaml | null;
  createdBy: string;
  lastUpdatedBy: string;
  deleted_at: Date | null;
  valid: boolean;
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
      enabled: {
        type: 'boolean',
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
      deleted_at: {
        type: 'date',
      },
      valid: {
        type: 'boolean',
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
    2: {
      changes: [
        {
          type: 'mappings_addition',
          addedMappings: {
            deleted_at: {
              type: 'date',
            },
          },
        },
      ],
    },
    3: {
      changes: [
        {
          type: 'mappings_addition',
          addedMappings: {
            enabled: {
              type: 'boolean' as const,
            },
          },
        },
        {
          type: 'mappings_deprecation',
          deprecatedMappings: ['status'],
        },
      ],
    },
    4: {
      changes: [
        {
          type: 'data_backfill',
          backfillFn: (doc) => {
            const { attributes } = doc;
            const result = parseWorkflowYamlToJSON(attributes.yaml, WORKFLOW_ZOD_SCHEMA_LOOSE);
            if (result.success) {
              return {
                attributes: { ...attributes, valid: true },
              };
            }
            return {
              attributes: { ...attributes, enabled: false, valid: false },
            };
          },
        },
        {
          type: 'mappings_addition',
          addedMappings: {
            valid: {
              type: 'boolean' as const,
            },
          },
        },
      ],
    },
  },
};
