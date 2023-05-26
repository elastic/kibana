/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { NodeDefinition } from '../types';

export const management: NodeDefinition = {
  id: 'management',
  title: 'Management',
  icon: 'gear',
  children: [
    {
      title: '',
      id: 'root',
      children: [
        {
          title: 'Stack monitoring',
          id: 'stack_monitoring',
        },
      ],
    },
    {
      title: 'Integration management',
      id: 'integration_management',
      children: [
        {
          title: 'Integrations',
          id: 'integrations',
        },
        {
          title: 'Fleet',
          id: 'fleet',
        },
        {
          title: 'Osquery',
          id: 'osquery',
        },
      ],
    },
    {
      title: 'Stack management',
      id: 'stack_management',
      children: [
        {
          title: 'Ingest',
          id: 'ingest',
          children: [
            {
              title: 'Ingest pipelines',
              id: 'ingest_pipelines',
            },
            {
              title: 'Logstash pipelines',
              id: 'logstash_pipelines',
            },
          ],
        },
        {
          title: 'Data',
          id: 'data',
          children: [
            {
              title: 'Index management',
              id: 'index_management',
            },
            {
              title: 'Index lifecycle policies',
              id: 'index_lifecycle_policies',
            },
            {
              title: 'Snapshot and restore',
              id: 'snapshot_and_restore',
            },
            {
              title: 'Rollup jobs',
              id: 'rollup_jobs',
            },
            {
              title: 'Transforms',
              id: 'transforms',
            },
            {
              title: 'Cross-cluster replication',
              id: 'cross_cluster_replication',
            },
            {
              title: 'Remote clusters',
              id: 'remote_clusters',
            },
          ],
        },
        {
          title: 'Alerts and insights',
          id: 'alerts_and_insights',
          children: [
            {
              title: 'Rules',
              id: 'rules',
            },
            {
              title: 'Cases',
              id: 'cases',
            },
            {
              title: 'Connectors',
              id: 'connectors',
            },
            {
              title: 'Reporting',
              id: 'reporting',
            },
            {
              title: 'Machine learning',
              id: 'machine_learning',
            },
            {
              title: 'Watcher',
              id: 'watcher',
            },
          ],
        },
        {
          title: 'Security',
          id: 'security',
          children: [
            {
              title: 'Users',
              id: 'users',
            },
            {
              title: 'Roles',
              id: 'roles',
            },
            {
              title: 'Role mappings',
              id: 'role_mappings',
            },
            {
              title: 'API keys',
              id: 'api_keys',
            },
          ],
        },
        {
          title: 'Kibana',
          id: 'kibana',
          children: [
            {
              title: 'Data view',
              id: 'data_views',
            },
            {
              title: 'Saved objects',
              id: 'saved_objects',
            },
            {
              title: 'Tags',
              id: 'tags',
            },
            {
              title: 'Search sessions',
              id: 'search_sessions',
            },
            {
              title: 'Spaces',
              id: 'spaces',
            },
            {
              title: 'Advanced settings',
              id: 'advanced_settings',
            },
          ],
        },
        {
          title: 'Upgrade assistant',
          id: 'upgrade_assistant',
        },
      ],
    },
  ],
};
