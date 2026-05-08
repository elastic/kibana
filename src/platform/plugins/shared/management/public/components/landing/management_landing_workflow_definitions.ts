/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { USER_CREATE_LANDING_OVERLAY_ID } from '../../../common/landing_quick_action_overlay_ids';

export interface ManagementLandingWorkflowLinkDefinition {
  readonly id: string;
  readonly label: string;
  readonly managementPath: string;
  /** If set and a renderer is registered on the landing page, the link opens this overlay instead of navigating. */
  readonly landingQuickActionOverlayId?: string;
  /** If unset, the link is shown whenever the flow is shown (flows gate on their own capability lists). */
  readonly capabilityPath?: string;
}

export interface ManagementLandingWorkflowFlowDefinition {
  readonly id: string;
  readonly categoryTitle: string;
  readonly links: readonly ManagementLandingWorkflowLinkDefinition[];
}

/**
 * Flow order matches Stack Management landing wireframe / product-spec getting-started priority:
 * ingestion → alerting → access → data review → snapshots.
 */
export const MANAGEMENT_LANDING_WORKFLOW_PATH_FLOWS: ManagementLandingWorkflowFlowDefinition[] = [
  {
    id: 'setup_ingestion',
    categoryTitle: i18n.translate('management.landing.workflowPaths.flow.setupIngestion.category', {
      defaultMessage: 'Set up ingestion',
    }),
    links: [
      {
        id: 'ingest_pipelines',
        label: i18n.translate(
          'management.landing.workflowPaths.flow.setupIngestion.ingestPipelines',
          {
            defaultMessage: 'Ingest pipelines',
          }
        ),
        managementPath: 'ingest/ingest_pipelines',
        capabilityPath: 'management.ingest.ingest_pipelines',
      },
      {
        id: 'index_management',
        label: i18n.translate(
          'management.landing.workflowPaths.flow.setupIngestion.indexManagement',
          {
            defaultMessage: 'Index management',
          }
        ),
        managementPath: 'data/index_management/indices',
        capabilityPath: 'management.data.index_management',
      },
      {
        id: 'templates',
        label: i18n.translate('management.landing.workflowPaths.flow.setupIngestion.templates', {
          defaultMessage: 'Templates',
        }),
        managementPath: 'data/index_management/templates',
        capabilityPath: 'management.data.index_management',
      },
    ],
  },
  {
    id: 'alerting',
    categoryTitle: i18n.translate('management.landing.workflowPaths.flow.alerting.category', {
      defaultMessage: 'Configure alerting',
    }),
    links: [
      {
        id: 'connectors',
        label: i18n.translate('management.landing.workflowPaths.flow.alerting.connectors', {
          defaultMessage: 'Connectors',
        }),
        managementPath: 'insightsAndAlerting/triggersActionsConnectors/connectors',
        capabilityPath: 'management.insightsAndAlerting.triggersActionsConnectors',
      },
      {
        id: 'rules',
        label: i18n.translate('management.landing.workflowPaths.flow.alerting.rules', {
          defaultMessage: 'Rules',
        }),
        managementPath: 'insightsAndAlerting/triggersActions',
        capabilityPath: 'management.insightsAndAlerting.triggersActions',
      },
      {
        id: 'action_logs',
        label: i18n.translate('management.landing.workflowPaths.flow.alerting.actions', {
          defaultMessage: 'Actions',
        }),
        managementPath: 'insightsAndAlerting/triggersActionsConnectors/logs',
        capabilityPath: 'management.insightsAndAlerting.triggersActionsConnectors',
      },
    ],
  },
  {
    id: 'access',
    categoryTitle: i18n.translate('management.landing.workflowPaths.flow.access.category', {
      defaultMessage: 'Manage access',
    }),
    links: [
      {
        id: 'add_user',
        label: i18n.translate('management.landing.workflowPaths.flow.access.addUser', {
          defaultMessage: 'Add user',
        }),
        managementPath: 'security/users/create',
        capabilityPath: 'management.security.users',
        landingQuickActionOverlayId: USER_CREATE_LANDING_OVERLAY_ID,
      },
      {
        id: 'users',
        label: i18n.translate('management.landing.workflowPaths.flow.access.users', {
          defaultMessage: 'Users',
        }),
        managementPath: 'security/users',
        capabilityPath: 'management.security.users',
      },
      {
        id: 'roles',
        label: i18n.translate('management.landing.workflowPaths.flow.access.roles', {
          defaultMessage: 'Roles',
        }),
        managementPath: 'security/roles',
        capabilityPath: 'management.security.roles',
      },
      {
        id: 'api_keys',
        label: i18n.translate('management.landing.workflowPaths.flow.access.apiKeys', {
          defaultMessage: 'API keys',
        }),
        managementPath: 'security/api_keys',
        capabilityPath: 'management.security.api_keys',
      },
    ],
  },
  {
    id: 'review_data',
    categoryTitle: i18n.translate('management.landing.workflowPaths.flow.reviewData.category', {
      defaultMessage: 'Review your data',
    }),
    links: [
      {
        id: 'indices',
        label: i18n.translate('management.landing.workflowPaths.flow.reviewData.indices', {
          defaultMessage: 'Indices',
        }),
        managementPath: 'data/index_management/indices',
        capabilityPath: 'management.data.index_management',
      },
      {
        id: 'data_streams',
        label: i18n.translate('management.landing.workflowPaths.flow.reviewData.dataStreams', {
          defaultMessage: 'Data streams',
        }),
        managementPath: 'data/index_management/data_streams',
        capabilityPath: 'management.data.index_management',
      },
      {
        id: 'ilm',
        label: i18n.translate('management.landing.workflowPaths.flow.reviewData.ilm', {
          defaultMessage: 'ILM policies',
        }),
        managementPath: 'data/index_lifecycle_management/policies',
        capabilityPath: 'management.data.index_lifecycle_management',
      },
    ],
  },
  {
    id: 'snapshot_restore',
    categoryTitle: i18n.translate(
      'management.landing.workflowPaths.flow.snapshotRestore.category',
      {
        defaultMessage: 'Snapshots and restore',
      }
    ),
    links: [
      {
        id: 'repositories',
        label: i18n.translate(
          'management.landing.workflowPaths.flow.snapshotRestore.repositories',
          {
            defaultMessage: 'Repositories',
          }
        ),
        managementPath: 'data/snapshot_restore/repositories',
        capabilityPath: 'management.data.snapshot_restore',
      },
      {
        id: 'policies',
        label: i18n.translate('management.landing.workflowPaths.flow.snapshotRestore.policies', {
          defaultMessage: 'Policies',
        }),
        managementPath: 'data/snapshot_restore/policies',
        capabilityPath: 'management.data.snapshot_restore',
      },
      {
        id: 'restore',
        label: i18n.translate('management.landing.workflowPaths.flow.snapshotRestore.testRestore', {
          defaultMessage: 'Test restore',
        }),
        managementPath: 'data/snapshot_restore/restore_status',
        capabilityPath: 'management.data.snapshot_restore',
      },
    ],
  },
];
