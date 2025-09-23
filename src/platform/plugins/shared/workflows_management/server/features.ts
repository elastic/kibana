/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DEFAULT_APP_CATEGORIES } from '@kbn/core-application-common';
import { KibanaFeatureScope } from '@kbn/features-plugin/common';
import { i18n } from '@kbn/i18n';
import type { WorkflowsManagementPluginServerDependenciesSetup } from './types';

/**
 * The order of appearance in the feature privilege page
 * under the management section.
 */
const FEATURE_ORDER = 3000;

export const registerFeatures = (plugins: WorkflowsManagementPluginServerDependenciesSetup) => {
  plugins.features?.registerKibanaFeature({
    app: [],
    category: DEFAULT_APP_CATEGORIES.kibana,
    id: 'workflowsManagement',
    name: i18n.translate(
      'platform.plugins.shared.workflows_management.featureRegistry.workflowsManagementFeatureName',
      {
        defaultMessage: 'Workflows',
      }
    ),
    order: FEATURE_ORDER,
    privileges: {
      all: {
        app: [],
        api: ['create', 'update', 'delete', 'read'],
        savedObject: {
          all: ['workflows', 'workflow_executions'],
          read: [],
        },
        ui: ['create', 'update', 'delete', 'read', 'execute'],
      },
      read: {
        app: [],
        api: ['read'],
        savedObject: {
          all: [],
          read: ['workflows', 'workflow_executions'],
        },
        ui: ['read'],
      },
    },
    scope: [KibanaFeatureScope.Spaces, KibanaFeatureScope.Security],
    subFeatures: [
      {
        name: i18n.translate(
          'platform.plugins.shared.workflows_management.featureRegistry.workflowsManagementSubFeatureName',
          {
            defaultMessage: 'Workflows Actions',
          }
        ),
        privilegeGroups: [
          {
            groupType: 'independent',
            privileges: [
              {
                api: ['workflow:create'],
                id: 'workflow_create',
                name: i18n.translate(
                  'platform.plugins.shared.workflows_management.featureRegistry.createWorkflowSubFeaturePrivilege',
                  {
                    defaultMessage: 'Create',
                  }
                ),
                includeIn: 'all',
                savedObject: {
                  all: ['workflow'],
                  read: [],
                },
                ui: ['createWorkflow'],
              },
              {
                api: ['workflow:update'],
                id: 'workflow_update',
                name: i18n.translate(
                  'platform.plugins.shared.workflows_management.featureRegistry.updateWorkflowSubFeaturePrivilege',
                  {
                    defaultMessage: 'Update',
                  }
                ),
                includeIn: 'all',
                savedObject: {
                  all: ['workflow'],
                  read: [],
                },
                ui: ['updateWorkflow'],
              },
              {
                api: ['workflow:delete'],
                id: 'workflow_delete',
                name: i18n.translate(
                  'platform.plugins.shared.workflows_management.featureRegistry.deleteWorkflowSubFeaturePrivilege',
                  {
                    defaultMessage: 'Delete',
                  }
                ),
                includeIn: 'all',
                savedObject: {
                  all: ['workflow'],
                  read: [],
                },
                ui: ['deleteWorkflow'],
              },
              {
                api: ['workflow:execute'],
                id: 'workflow_execute',
                name: i18n.translate(
                  'platform.plugins.shared.workflows_management.featureRegistry.executeWorkflowSubFeaturePrivilege',
                  {
                    defaultMessage: 'Execute',
                  }
                ),
                includeIn: 'all',
                savedObject: {
                  all: ['workflow_execution'],
                  read: ['workflow'],
                },
                ui: ['executeWorkflow'],
              },
              {
                api: ['workflow:read'],
                id: 'workflow_read',
                name: i18n.translate(
                  'platform.plugins.shared.workflows_management.featureRegistry.readWorkflowSubFeaturePrivilege',
                  {
                    defaultMessage: 'Read',
                  }
                ),
                includeIn: 'read',
                savedObject: {
                  read: ['workflow'],
                  all: [],
                },
                ui: ['readWorkflow'],
              },
              {
                api: ['workflow_execution:read'],
                id: 'workflow_execution_read',
                name: i18n.translate(
                  'platform.plugins.shared.workflows_management.featureRegistry.readWorkflowExecutionSubFeaturePrivilege',
                  {
                    defaultMessage: 'Read Workflow Execution',
                  }
                ),
                includeIn: 'read',
                savedObject: {
                  read: ['workflow_execution'],
                  all: [],
                },
                ui: ['readWorkflowExecution'],
              },
              {
                api: ['workflow_execution:cancel'],
                id: 'workflow_execution_cancel',
                name: i18n.translate(
                  'platform.plugins.shared.workflows_management.featureRegistry.cancelWorkflowExecutionSubFeaturePrivilege',
                  {
                    defaultMessage: 'Cancel Workflow Execution',
                  }
                ),
                includeIn: 'all',
                savedObject: {
                  read: ['workflow_execution'],
                  all: [],
                },
                ui: ['cancelWorkflowExecution'],
              },
            ],
          },
        ],
      },
    ],
  });
};
