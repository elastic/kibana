/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { AppDeepLinkId } from '@kbn/core-chrome-browser';

import type { NodeDefinitionWithChildren } from '../types';

export type ID =
  | 'sharedux:management'
  | 'root'
  | 'stack_monitoring'
  | 'integration_management'
  | 'integrations'
  | 'fleet'
  | 'osquery'
  | 'stack_management'
  | 'ingest'
  | 'ingest_pipelines'
  | 'logstash_pipelines'
  | 'data'
  | 'index_management'
  | 'index_lifecycle_policies'
  | 'snapshot_and_restore'
  | 'rollup_jobs'
  | 'transforms'
  | 'cross_cluster_replication'
  | 'remote_clusters'
  | 'alerts_and_insights'
  | 'rules'
  | 'cases'
  | 'connectors'
  | 'reporting'
  | 'machine_learning'
  | 'watcher'
  | 'security'
  | 'users'
  | 'roles'
  | 'role_mappings'
  | 'api_keys'
  | 'kibana'
  | 'data_views'
  | 'saved_objects'
  | 'tags'
  | 'search_sessions'
  | 'spaces'
  | 'advanced_settings'
  | 'upgrade_assistant';

export const management: NodeDefinitionWithChildren<AppDeepLinkId, ID> = {
  id: 'sharedux:management',
  title: 'Management',
  icon: 'gear',
  children: [
    {
      id: 'root',
      title: '',
      children: [
        {
          id: 'stack_monitoring',
          title: 'Stack monitoring',
          href: '/app/monitoring',
        },
      ],
    },
    {
      id: 'integration_management',
      title: 'Integration management',
      children: [
        {
          id: 'integrations',
          title: 'Integrations',
          href: '/app/integrations',
        },
        {
          id: 'fleet',
          title: 'Fleet',
          href: '/app/fleet',
        },
        {
          id: 'osquery',
          title: 'Osquery',
          href: '/app/osquery',
        },
      ],
    },
    {
      id: 'stack_management',
      title: 'Stack management',
      children: [
        {
          id: 'ingest',
          title: 'Ingest',
          children: [
            {
              id: 'ingest_pipelines',
              title: 'Ingest pipelines',
              href: '/app/management/ingest/ingest_pipelines',
            },
            {
              id: 'logstash_pipelines',
              title: 'Logstash pipelines',
              href: '/app/management/ingest/pipelines',
            },
          ],
        },
        {
          id: 'data',
          title: 'Data',
          children: [
            {
              id: 'index_management',
              title: 'Index management',
              href: '/app/management/data/index_management',
            },
            {
              id: 'index_lifecycle_policies',
              title: 'Index lifecycle policies',
              href: '/app/management/data/index_lifecycle_management',
            },
            {
              id: 'snapshot_and_restore',
              title: 'Snapshot and restore',
              href: 'app/management/data/snapshot_restore',
            },
            {
              id: 'rollup_jobs',
              title: 'Rollup jobs',
              href: '/app/management/data/rollup_jobs',
            },
            {
              id: 'transforms',
              title: 'Transforms',
              href: '/app/management/data/transform',
            },
            {
              id: 'cross_cluster_replication',
              title: 'Cross-cluster replication',
              href: '/app/management/data/cross_cluster_replication',
            },
            {
              id: 'remote_clusters',
              title: 'Remote clusters',
              href: '/app/management/data/remote_clusters',
            },
          ],
        },
        {
          id: 'alerts_and_insights',
          title: 'Alerts and insights',
          children: [
            {
              id: 'rules',
              title: 'Rules',
              href: '/app/management/insightsAndAlerting/triggersActions/rules',
            },
            {
              id: 'cases',
              title: 'Cases',
              href: '/app/management/insightsAndAlerting/cases',
            },
            {
              id: 'connectors',
              title: 'Connectors',
              href: '/app/management/insightsAndAlerting/triggersActionsConnectors/connectors',
            },
            {
              id: 'reporting',
              title: 'Reporting',
              href: '/app/management/insightsAndAlerting/reporting',
            },
            {
              id: 'machine_learning',
              title: 'Machine learning',
              href: '/app/management/insightsAndAlerting/jobsListLink',
            },
            {
              id: 'watcher',
              title: 'Watcher',
              href: '/app/management/insightsAndAlerting/watcher',
            },
          ],
        },
        {
          id: 'security',
          title: 'Security',
          children: [
            {
              id: 'users',
              title: 'Users',
              href: '/app/management/security/users',
            },
            {
              id: 'roles',
              title: 'Roles',
              href: '/app/management/security/roles',
            },
            {
              id: 'role_mappings',
              title: 'Role mappings',
              href: '/app/management/security/role_mappings',
            },
            {
              id: 'api_keys',
              title: 'API keys',
              href: '/app/management/security/api_keys',
            },
          ],
        },
        {
          id: 'kibana',
          title: 'Kibana',
          children: [
            {
              id: 'data_views',
              title: 'Data view',
              href: '/app/management/kibana/dataViews',
            },
            {
              id: 'saved_objects',
              title: 'Saved objects',
              href: '/app/management/kibana/objects',
            },
            {
              id: 'tags',
              title: 'Tags',
              href: '/app/management/kibana/tags',
            },
            {
              id: 'search_sessions',
              title: 'Search sessions',
              href: '/app/management/kibana/search_sessions',
            },
            {
              id: 'spaces',
              title: 'Spaces',
              href: '/app/management/kibana/spaces',
            },
            {
              id: 'advanced_settings',
              title: 'Advanced settings',
              href: '/app/management/kibana/settings',
            },
          ],
        },
        {
          id: 'upgrade_assistant',
          title: 'Upgrade assistant',
          href: '/app/management/stack/upgrade_assistant',
        },
      ],
    },
  ],
};
