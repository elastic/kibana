/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { NavItemProps } from '../../../types';
import { locators } from './_locators';

export const managementItemSet: NavItemProps[] = [
  {
    name: '',
    id: 'root',
    items: [
      {
        name: 'Stack monitoring',
        id: 'stack_monitoring',
        ...locators.unknown({ id: 'stack_monitoring' }),
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
        ...locators.unknown({ sectionId: 'integrations' }),
      },
      { name: 'Fleet', id: 'fleet', ...locators.unknown({ sectionId: 'fleet' }) },
      { name: 'Osquery', id: 'osquery', ...locators.unknown({ sectionId: 'osquery' }) },
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
            ...locators.management({ sectionId: 'ingest', appId: 'ingest_pipelines' }),
          },
          {
            name: 'Logstash pipelines',
            id: 'logstash_pipelines',
            ...locators.management({ sectionId: 'logstash', appId: 'pipelines' }),
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
            ...locators.management({ sectionId: 'data', appId: 'index_management' }),
          },
          {
            name: 'Index lifecycle policies',
            id: 'index_lifecycle_policies',
            ...locators.management({ sectionId: 'data', appId: 'index_lifecycle_management' }),
          },
          {
            name: 'Snapshot and restore',
            id: 'snapshot_and_restore',
            ...locators.management({ sectionId: 'data', appId: 'snapshot_restore' }),
          },
          {
            name: 'Rollup jobs',
            id: 'rollup_jobs',
            ...locators.management({ sectionId: 'data', appId: 'rollup_jobs' }),
          },
          {
            name: 'Transforms',
            id: 'transforms',
            ...locators.management({ sectionId: 'data', appId: 'transform' }),
          },
          {
            name: 'Cross-cluster replication',
            id: 'cross_cluster_replication',
            ...locators.management({ sectionId: 'data', appId: 'cross_cluster_replication' }),
          },
          {
            name: 'Remote clusters',
            id: 'remote_clusters',
            ...locators.management({ sectionId: 'data', appId: 'remote_clusters' }),
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
            ...locators.management({ sectionId: 'insightsAndAlerting', appId: 'triggersActions' }),
          },
          {
            name: 'Cases',
            id: 'cases',
            ...locators.management({ sectionId: 'insightsAndAlerting', appId: 'cases' }),
          },
          {
            name: 'Connectors',
            id: 'connectors',
            ...locators.management({
              sectionId: 'insightsAndAlerting',
              appId: 'triggersActionsConnectors',
            }),
          },
          {
            name: 'Reporting',
            id: 'reporting',
            ...locators.management({ sectionId: 'insightsAndAlerting', appId: 'reporting' }),
          },
          {
            name: 'Machine learning',
            id: 'machine_learning',
            ...locators.management({ sectionId: 'insightsAndAlerting', appId: 'jobsListLink' }),
          },
          {
            name: 'Watcher',
            id: 'watcher',
            ...locators.management({ sectionId: 'insightsAndAlerting', appId: 'watcher' }),
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
            ...locators.management({ sectionId: 'security', appId: 'users' }),
          },
          {
            name: 'Roles',
            id: 'roles',
            ...locators.management({ sectionId: 'security', appId: 'roles' }),
          },
          {
            name: 'Role mappings',
            id: 'role_mappings',
            ...locators.management({ sectionId: 'security', appId: 'role_mappings' }),
          },
          {
            name: 'API keys',
            id: 'api_keys',
            ...locators.management({ sectionId: 'security', appId: 'api_keys' }),
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
            ...locators.management({ sectionId: 'kibana', appId: 'data_views' }),
          },
          {
            name: 'Saved objects',
            id: 'saved_objects',
            ...locators.management({ sectionId: 'kibana', appId: 'saved_objects' }),
          },
          {
            name: 'Tags',
            id: 'tags',
            ...locators.management({ sectionId: 'kibana', appId: 'tags' }),
          },
          {
            name: 'Search sessions',
            id: 'search_sessions',
            ...locators.management({ sectionId: 'kibana', appId: 'search_sessions' }),
          },
          {
            name: 'Spaces',
            id: 'spaces',
            ...locators.management({ sectionId: 'kibana', appId: 'spaces' }),
          },
          {
            name: 'Advanced settings',
            id: 'advanced_settings',
            ...locators.management({ sectionId: 'kibana', appId: 'settings' }),
          },
        ],
      },
      {
        name: 'Upgrade assistant',
        id: 'upgrade_assistant',
        ...locators.management({ sectionId: 'kibana', appId: 'stack/upgrade_assistant' }),
      },
    ],
  },
];
