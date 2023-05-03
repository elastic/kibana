/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { NavItemProps } from '../../../types';

export const managementItemSet: NavItemProps[] = [
  {
    name: '',
    id: 'root',
    items: [
      {
        name: 'Stack monitoring',
        id: 'stack_monitoring',
        href: '/app/monitoring',
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
        href: '/app/integrations',
      },
      {
        name: 'Fleet',
        id: 'fleet',
        href: '/app/fleet',
      },
      {
        name: 'Osquery',
        id: 'osquery',
        href: '/app/osquery',
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
            href: '/app/management/ingest/ingest_pipelines',
          },
          {
            name: 'Logstash pipelines',
            id: 'logstash_pipelines',
            href: '/app/management/ingest/pipelines',
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
            href: '/app/management/data/index_management',
          },
          {
            name: 'Index lifecycle policies',
            id: 'index_lifecycle_policies',
            href: '/app/management/data/index_lifecycle_management',
          },
          {
            name: 'Snapshot and restore',
            id: 'snapshot_and_restore',
            href: 'app/management/data/snapshot_restore',
          },
          {
            name: 'Rollup jobs',
            id: 'rollup_jobs',
            href: '/app/management/data/rollup_jobs',
          },
          {
            name: 'Transforms',
            id: 'transforms',
            href: '/app/management/data/transform',
          },
          {
            name: 'Cross-cluster replication',
            id: 'cross_cluster_replication',
            href: '/app/management/data/cross_cluster_replication',
          },
          {
            name: 'Remote clusters',
            id: 'remote_clusters',
            href: '/app/management/data/remote_clusters',
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
            href: '/app/management/insightsAndAlerting/triggersActions/rules',
          },
          {
            name: 'Cases',
            id: 'cases',
            href: '/app/management/insightsAndAlerting/cases',
          },
          {
            name: 'Connectors',
            id: 'connectors',
            href: '/app/management/insightsAndAlerting/triggersActionsConnectors/connectors',
          },
          {
            name: 'Reporting',
            id: 'reporting',
            href: '/app/management/insightsAndAlerting/reporting',
          },
          {
            name: 'Machine learning',
            id: 'machine_learning',
            href: '/app/management/insightsAndAlerting/jobsListLink',
          },
          {
            name: 'Watcher',
            id: 'watcher',
            href: '/app/management/insightsAndAlerting/watcher',
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
            href: '/app/management/security/users',
          },
          {
            name: 'Roles',
            id: 'roles',
            href: '/app/management/security/roles',
          },
          {
            name: 'Role mappings',
            id: 'role_mappings',
            href: '/app/management/security/role_mappings',
          },
          {
            name: 'API keys',
            id: 'api_keys',
            href: '/app/management/security/api_keys',
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
            href: '/app/management/kibana/dataViews',
          },
          {
            name: 'Saved objects',
            id: 'saved_objects',
            href: '/app/management/kibana/objects',
          },
          {
            name: 'Tags',
            id: 'tags',
            href: '/app/management/kibana/tags',
          },
          {
            name: 'Search sessions',
            id: 'search_sessions',
            href: '/app/management/kibana/search_sessions',
          },
          {
            name: 'Spaces',
            id: 'spaces',
            href: '/app/management/kibana/spaces',
          },
          {
            name: 'Advanced settings',
            id: 'advanced_settings',
            href: '/app/management/kibana/settings',
          },
        ],
      },
      {
        name: 'Upgrade assistant',
        id: 'upgrade_assistant',
        href: '/app/management/stack/upgrade_assistant',
      },
    ],
  },
];
