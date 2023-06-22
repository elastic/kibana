/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ChromeNavigationNodeViewModel } from '../../../types';

// TODO: Declare ChromeNavigationNode[] (with "link" to app id or deeplink id)
// and then call an api on the Chrome service to convert to ChromeNavigationNodeViewModel
// with its "href", "isActive"... metadata

export const managementItemSet: ChromeNavigationNodeViewModel[] = [
  {
    title: '',
    id: 'root',
    items: [
      {
        title: 'Stack monitoring',
        id: 'stack_monitoring',
        href: '/app/monitoring',
      },
    ],
  },
  {
    title: 'Integration management',
    id: 'integration_management',
    items: [
      {
        title: 'Integrations',
        id: 'integrations',
        href: '/app/integrations',
      },
      {
        title: 'Fleet',
        id: 'fleet',
        href: '/app/fleet',
      },
      {
        title: 'Osquery',
        id: 'osquery',
        href: '/app/osquery',
      },
    ],
  },
  {
    title: 'Stack management',
    id: 'stack_management',
    items: [
      {
        title: 'Ingest',
        id: 'ingest',
        items: [
          {
            title: 'Ingest pipelines',
            id: 'ingest_pipelines',
            href: '/app/management/ingest/ingest_pipelines',
          },
          {
            title: 'Logstash pipelines',
            id: 'logstash_pipelines',
            href: '/app/management/ingest/pipelines',
          },
        ],
      },
      {
        title: 'Data',
        id: 'data',
        items: [
          {
            title: 'Index management',
            id: 'index_management',
            href: '/app/management/data/index_management',
          },
          {
            title: 'Index lifecycle policies',
            id: 'index_lifecycle_policies',
            href: '/app/management/data/index_lifecycle_management',
          },
          {
            title: 'Snapshot and restore',
            id: 'snapshot_and_restore',
            href: 'app/management/data/snapshot_restore',
          },
          {
            title: 'Rollup jobs',
            id: 'rollup_jobs',
            href: '/app/management/data/rollup_jobs',
          },
          {
            title: 'Transforms',
            id: 'transforms',
            href: '/app/management/data/transform',
          },
          {
            title: 'Cross-cluster replication',
            id: 'cross_cluster_replication',
            href: '/app/management/data/cross_cluster_replication',
          },
          {
            title: 'Remote clusters',
            id: 'remote_clusters',
            href: '/app/management/data/remote_clusters',
          },
        ],
      },
      {
        title: 'Alerts and insights',
        id: 'alerts_and_insights',
        items: [
          {
            title: 'Rules',
            id: 'rules',
            href: '/app/management/insightsAndAlerting/triggersActions/rules',
          },
          {
            title: 'Cases',
            id: 'cases',
            href: '/app/management/insightsAndAlerting/cases',
          },
          {
            title: 'Connectors',
            id: 'connectors',
            href: '/app/management/insightsAndAlerting/triggersActionsConnectors/connectors',
          },
          {
            title: 'Reporting',
            id: 'reporting',
            href: '/app/management/insightsAndAlerting/reporting',
          },
          {
            title: 'Machine learning',
            id: 'machine_learning',
            href: '/app/management/insightsAndAlerting/jobsListLink',
          },
          {
            title: 'Watcher',
            id: 'watcher',
            href: '/app/management/insightsAndAlerting/watcher',
          },
        ],
      },
      {
        title: 'Security',
        id: 'security',
        items: [
          {
            title: 'Users',
            id: 'users',
            href: '/app/management/security/users',
          },
          {
            title: 'Roles',
            id: 'roles',
            href: '/app/management/security/roles',
          },
          {
            title: 'Role mappings',
            id: 'role_mappings',
            href: '/app/management/security/role_mappings',
          },
          {
            title: 'API keys',
            id: 'api_keys',
            href: '/app/management/security/api_keys',
          },
        ],
      },
      {
        title: 'Kibana',
        id: 'kibana',
        items: [
          {
            title: 'Data view',
            id: 'data_views',
            href: '/app/management/kibana/dataViews',
          },
          {
            title: 'Saved objects',
            id: 'saved_objects',
            href: '/app/management/kibana/objects',
          },
          {
            title: 'Tags',
            id: 'tags',
            href: '/app/management/kibana/tags',
          },
          {
            title: 'Search sessions',
            id: 'search_sessions',
            href: '/app/management/kibana/search_sessions',
          },
          {
            title: 'Spaces',
            id: 'spaces',
            href: '/app/management/kibana/spaces',
          },
          {
            title: 'Advanced settings',
            id: 'advanced_settings',
            href: '/app/management/kibana/settings',
          },
        ],
      },
      {
        title: 'Upgrade assistant',
        id: 'upgrade_assistant',
        href: '/app/management/stack/upgrade_assistant',
      },
    ],
  },
];
