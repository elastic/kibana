/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { NavItemProps } from '../../../types';
import { locatorIds } from './_locators';

const managementLocator = (params: { sectionId: string; appId?: string }) => ({
  locator: { id: locatorIds.management, params },
});

export const managementItemSet: NavItemProps[] = [
  {
    name: '',
    id: 'root',
    items: [
      {
        name: 'Stack monitoring',
        id: 'stack_monitoring',
        locator: { id: 'STACK_MONITORING_APP_LOCATOR' },
      },
    ],
  },
  {
    name: 'Integration management',
    id: 'integration_management',
    items: [
      {
        name: 'Integrations',
        id: 'integrations',
        locator: { id: locatorIds.integrations },
      },
      {
        name: 'Fleet',
        id: 'fleet',
        locator: { id: locatorIds.fleet },
      },
      {
        name: 'Osquery',
        id: 'osquery',
        locator: { id: locatorIds.osquery },
      },
    ],
  },
  {
    name: 'Stack management',
    id: 'stack_management',
    items: [
      {
        name: 'Ingest',
        id: 'ingest',
        items: [
          {
            name: 'Ingest pipelines',
            id: 'ingest_pipelines',
            locator: { id: locatorIds.ingestPipelines },
          },
          {
            name: 'Logstash pipelines',
            id: 'logstash_pipelines',
            locator: { id: locatorIds.logstashPipelines },
          },
        ],
      },
      {
        name: 'Data',
        id: 'data',
        items: [
          {
            name: 'Index management',
            id: 'index_management',
            locator: { id: locatorIds.indexManagement },
          },
          {
            name: 'Index lifecycle policies',
            id: 'index_lifecycle_policies',
            locator: { id: locatorIds.ilm },
          },
          {
            name: 'Snapshot and restore',
            id: 'snapshot_and_restore',
            locator: { id: locatorIds.snapshotRestore },
          },
          {
            name: 'Rollup jobs',
            id: 'rollup_jobs',
            locator: { id: locatorIds.rollup },
          },
          {
            name: 'Transforms',
            id: 'transforms',
            locator: { id: locatorIds.transform },
          },
          {
            name: 'Cross-cluster replication',
            id: 'cross_cluster_replication',
            locator: { id: locatorIds.crossClusterReplication },
          },
          {
            name: 'Remote clusters',
            id: 'remote_clusters',
            locator: { id: locatorIds.remoteClusters },
          },
        ],
      },
      {
        name: 'Alerts and insights',
        id: 'alerts_and_insights',
        items: [
          {
            name: 'Rules',
            id: 'rules',
            locator: { id: locatorIds.alertingManagement, params: { appId: 'triggersActions' } },
          },
          {
            name: 'Cases',
            id: 'cases',
            locator: { id: locatorIds.alertingManagement, params: { appId: 'cases' } },
          },
          {
            name: 'Connectors',
            id: 'connectors',
            locator: {
              id: locatorIds.alertingManagement,
              params: { appId: 'triggersActionsConnectors' },
            },
          },
          {
            name: 'Reporting',
            id: 'reporting',
            locator: { id: locatorIds.reporting },
          },
          {
            name: 'Machine learning',
            id: 'machine_learning',
            locator: { id: locatorIds.mlJobsManagement },
          },
          {
            name: 'Watcher',
            id: 'watcher',
            locator: { id: locatorIds.watcher },
          },
        ],
      },
      {
        name: 'Security',
        id: 'security',
        items: [
          {
            name: 'Users',
            id: 'users',
            locator: { id: locatorIds.securityManagement, params: { appId: 'users' } },
          },
          {
            name: 'Roles',
            id: 'roles',
            locator: { id: locatorIds.securityManagement, params: { appId: 'roles' } },
          },
          {
            name: 'Role mappings',
            id: 'role_mappings',
            locator: { id: locatorIds.securityManagement, params: { appId: 'role_mappings' } },
          },
          {
            name: 'API keys',
            id: 'api_keys',
            locator: { id: locatorIds.securityManagement, params: { appId: 'api_keys' } },
          },
        ],
      },
      {
        name: 'Kibana',
        id: 'kibana',
        items: [
          {
            name: 'Data view',
            id: 'data_views',
            ...managementLocator({ sectionId: 'kibana', appId: 'dataViews' }),
          },
          {
            name: 'Saved objects',
            id: 'saved_objects',
            ...managementLocator({ sectionId: 'kibana', appId: 'objects' }),
          },
          {
            name: 'Tags',
            id: 'tags',
            ...managementLocator({ sectionId: 'kibana', appId: 'tags' }),
          },
          {
            name: 'Search sessions',
            id: 'search_sessions',
            ...managementLocator({ sectionId: 'kibana', appId: 'search_sessions' }),
          },
          {
            name: 'Spaces',
            id: 'spaces',
            locator: { id: 'SPACES_MANAGEMENT_APP_LOCATOR' },
          },
          {
            name: 'Advanced settings',
            id: 'advanced_settings',
            ...managementLocator({ sectionId: 'kibana', appId: 'settings' }),
          },
        ],
      },
      {
        name: 'Upgrade assistant',
        id: 'upgrade_assistant',
        locator: { id: locatorIds.upgradeAssistant },
      },
    ],
  },
];
