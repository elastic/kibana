/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { LocatorId } from '@kbn/shared-ux-locators';
import { NavItemProps } from '../../../types';

const { Management } = LocatorId;

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
        locator: { id: LocatorId.Integrations },
      },
      {
        name: 'Fleet',
        id: 'fleet',
        locator: { id: LocatorId.Fleet },
      },
      {
        name: 'Osquery',
        id: 'osquery',
        locator: { id: LocatorId.Osquery },
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
            locator: { id: LocatorId.IngestPipelines },
          },
          {
            name: 'Logstash pipelines',
            id: 'logstash_pipelines',
            locator: { id: LocatorId.LogstashPipelines },
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
            locator: { id: LocatorId.IndexManagement },
          },
          {
            name: 'Index lifecycle policies',
            id: 'index_lifecycle_policies',
            locator: { id: LocatorId.ILM },
          },
          {
            name: 'Snapshot and restore',
            id: 'snapshot_and_restore',
            locator: { id: LocatorId.SnapshotRestore },
          },
          {
            name: 'Rollup jobs',
            id: 'rollup_jobs',
            locator: { id: LocatorId.Rollup },
          },
          {
            name: 'Transforms',
            id: 'transforms',
            locator: { id: LocatorId.Transform },
          },
          {
            name: 'Cross-cluster replication',
            id: 'cross_cluster_replication',
            locator: { id: LocatorId.CrossClusterReplication },
          },
          {
            name: 'Remote clusters',
            id: 'remote_clusters',
            locator: { id: LocatorId.RemoteClusters },
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
            locator: { id: LocatorId.RulesManagement, params: { appId: 'triggersActions' } },
          },
          {
            name: 'Cases',
            id: 'cases',
            locator: { id: LocatorId.CasesManagement, params: { appId: 'cases' } },
          },
          {
            name: 'Connectors',
            id: 'connectors',
            locator: {
              id: LocatorId.ConnectorsManagement,
              params: { appId: 'triggersActionsConnectors' },
            },
          },
          {
            name: 'Reporting',
            id: 'reporting',
            locator: { id: LocatorId.Reporting },
          },
          {
            name: 'Machine learning',
            id: 'machine_learning',
            locator: { id: LocatorId.MachineLearningManagement },
          },
          {
            name: 'Watcher',
            id: 'watcher',
            locator: { id: LocatorId.Watcher },
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
            locator: { id: LocatorId.Security, params: { appId: 'users' } },
          },
          {
            name: 'Roles',
            id: 'roles',
            locator: { id: LocatorId.Security, params: { appId: 'roles' } },
          },
          {
            name: 'Role mappings',
            id: 'role_mappings',
            locator: { id: LocatorId.Security, params: { appId: 'role_mappings' } },
          },
          {
            name: 'API keys',
            id: 'api_keys',
            locator: { id: LocatorId.Security, params: { appId: 'api_keys' } },
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
            locator: {
              id: Management,
              params: { sectionId: 'kibana', appId: 'dataViews' },
            },
          },
          {
            name: 'Saved objects',
            id: 'saved_objects',
            locator: {
              id: Management,
              params: { sectionId: 'kibana', appId: 'objects' },
            },
          },
          {
            name: 'Tags',
            id: 'tags',
            locator: { id: Management, params: { sectionId: 'kibana', appId: 'tags' } },
          },
          {
            name: 'Search sessions',
            id: 'search_sessions',
            locator: {
              id: Management,
              params: { sectionId: 'kibana', appId: 'search_sessions' },
            },
          },
          {
            name: 'Spaces',
            id: 'spaces',
            locator: { id: LocatorId.Spaces },
          },
          {
            name: 'Advanced settings',
            id: 'advanced_settings',
            locator: {
              id: Management,
              params: { sectionId: 'kibana', appId: 'settings' },
            },
          },
        ],
      },
      {
        name: 'Upgrade assistant',
        id: 'upgrade_assistant',
        locator: { id: LocatorId.UpgradeAssistant },
      },
    ],
  },
];
