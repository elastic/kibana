/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { MenuItem } from '../../types';

export const LOGO = {
  label: 'Observability',
  logoType: 'logoObservability',
};

export const PRIMARY_MENU_ITEMS: MenuItem[] = [
  {
    id: 'discover',
    label: 'Discover',
    iconType: 'discoverApp',
    href: '/discover',
  },
  {
    id: 'dashboards',
    label: 'Dashboards',
    iconType: 'dashboardApp',
    href: '/dashboards',
  },
  {
    id: 'overview',
    label: 'Overview',
    iconType: 'info',
    href: '/overview',
  },
  { id: 'alerts', label: 'Alerts', iconType: 'bell', href: '/alerts' },
  { id: 'cases', label: 'Cases', iconType: 'casesApp', href: '/cases' },
  {
    id: 'slos',
    label: 'SLOs',
    iconType: 'visGauge',
    href: '/slos',
  },
  {
    id: 'apps',
    label: 'Apps',
    iconType: 'apps',
    href: '/apps/service-inventory',
    sections: [
      {
        id: 'apps-section-1',
        label: null,
        items: [
          {
            id: 'service-inventory',
            label: 'Service inventory',
            href: '/apps/service-inventory',
          },
          { id: 'traces', label: 'Traces', href: '/apps/traces' },
          {
            id: 'dependencies',
            label: 'Dependencies',
            href: '/apps/dependencies',
          },
          { id: 'settings', label: 'Settings', href: '/apps/settings' },
        ],
      },
      {
        id: 'synthetics',
        label: 'Synthetics',
        items: [
          { id: 'overview', label: 'Overview', href: '/synthetics/overview' },
          {
            id: 'tls-certificates',
            label: 'TLS certificates',
            href: '/synthetics/tls-certificates',
          },
        ],
      },
    ],
  },
  {
    id: 'infrastructure',
    label: 'Infrastructure',
    iconType: 'storage',
    href: '/infrastructure/inventory',
    sections: [
      {
        id: 'infrastructure-section-1',
        label: null,
        items: [
          {
            id: 'inventory',
            label: 'Infrastructure inventory',
            href: '/infrastructure/inventory',
          },
          { id: 'hosts', label: 'Hosts', href: '/infrastructure/hosts' },
          {
            id: 'settings',
            label: 'Settings',
            href: '/infrastructure/settings',
          },
        ],
      },
    ],
  },
  {
    id: 'ai-assistant',
    label: 'AI assistant',
    iconType: 'info',
    href: '/ai-assistant',
  },
  {
    id: 'streams',
    label: 'Streams',
    iconType: 'logstashQueue',
    href: '/streams',
  },
  {
    id: 'machine-learning',
    label: 'Machine learning',
    iconType: 'machineLearningApp',
    href: '/ml/overview',
    sections: [
      {
        id: 'ml-section-1',
        label: null,
        items: [
          { id: 'overview', label: 'Overview', href: '/ml/overview' },
          {
            id: 'data-visualizer',
            label: 'Data visualizer',
            href: '/ml/data-visualizer',
          },
        ],
      },
      {
        id: 'anomaly-detection',
        label: 'Anomaly detection',
        items: [
          {
            id: 'anomaly-explorer',
            label: 'Anomaly explorer',
            href: '/ml/anomaly-detection/anomaly-explorer',
          },
          {
            id: 'single-metrics-viewer',
            label: 'Single metrics viewer',
            href: '/ml/anomaly-detection/single-metrics-viewer',
          },
        ],
      },
      {
        id: 'data-frame-analytics',
        label: 'Data frame analytics',
        items: [
          {
            id: 'results-explorer',
            label: 'Results explorer',
            href: '/ml/data-frame-analytics/results-explorer',
          },
          {
            id: 'analytics-map',
            label: 'Analytics map',
            href: '/ml/data-frame-analytics/analytics-map',
          },
        ],
      },
      {
        id: 'aiops-labs',
        label: 'AIOps labs',
        items: [
          {
            id: 'log-rate-analysis',
            label: 'Log rate analysis',
            href: '/ml/aiops-labs/log-rate-analysis',
          },
          {
            id: 'log-pattern-analysis',
            label: 'Log pattern analysis',
            href: '/ml/aiops-labs/log-pattern-analysis',
          },
          {
            id: 'change-point-detection',
            label: 'Change point detection',
            href: '/ml/aiops-labs/change-point-detection',
          },
        ],
      },
    ],
  },
];

export const PRIMARY_MENU_FOOTER_ITEMS: MenuItem[] = [
  {
    id: 'getting_started',
    label: 'Getting started',
    iconType: 'launch',
    href: '/getting-started',
  },
  {
    id: 'developer_tools',
    label: 'Developer tools',
    iconType: 'code',
    href: '/developer-tools',
  },
  {
    id: 'settings',
    label: 'Settings',
    iconType: 'gear',
    href: '/settings/project/performance',
    sections: [
      {
        id: 'project',
        label: 'Project',
        items: [
          {
            id: 'project-performance',
            label: 'Performance',
            href: '/settings/project/performance',
          },
          {
            id: 'project-integrations',
            label: 'Integrations',
            href: '/settings/project/integrations',
          },
          {
            id: 'project-fleet',
            label: 'Fleet',
            href: '/settings/project/fleet',
          },
        ],
      },
      {
        id: 'data',
        label: 'Data',
        items: [
          {
            id: 'data-ingest-pipelines',
            label: 'Ingest pipelines',
            href: '/settings/data/ingest-pipelines',
          },
          {
            id: 'data-logstash-pipelines',
            label: 'Logstash pipelines',
            href: '/settings/data/logstash-pipelines',
          },
          {
            id: 'data-index-management',
            label: 'Index management',
            href: '/settings/data/index-management',
          },
          {
            id: 'data-transforms',
            label: 'Transforms',
            href: '/settings/data/transforms',
          },
          {
            id: 'data-views',
            label: 'Data views',
            href: '/settings/data/views',
          },
          {
            id: 'data-set-quality',
            label: 'Data set quality',
            href: '/settings/data/set-quality',
          },
          {
            id: 'data-usage',
            label: 'Data usage',
            href: '/settings/data/usage',
          },
        ],
      },
      {
        id: 'access',
        label: 'Access',
        items: [
          {
            id: 'access-org-members',
            label: 'Org members',
            href: '/settings/access/org-members',
            external: true,
          },
          {
            id: 'access-billing',
            label: 'Billing and subscriptions',
            href: '/settings/access/billing',
            external: true,
          },
          {
            id: 'access-api-keys',
            label: 'API keys',
            href: '/settings/access/api-keys',
          },
          {
            id: 'access-users',
            label: 'Users',
            href: '/settings/access/users',
          },
          {
            id: 'access-roles',
            label: 'Roles',
            href: '/settings/access/roles',
          },
          {
            id: 'access-role-mappings',
            label: 'Role mappings',
            href: '/settings/access/role-mappings',
          },
          {
            id: 'access-spaces',
            label: 'Spaces',
            href: '/settings/access/spaces',
          },
        ],
      },
      {
        id: 'alerts_and_insights',
        label: 'Alerts and insights',
        items: [
          {
            id: 'alerts-rules',
            label: 'Rules',
            href: '/settings/alerts/rules',
          },
          {
            id: 'alerts-connectors',
            label: 'Connectors',
            href: '/settings/alerts/connectors',
          },
          {
            id: 'alerts-maintenance-windows',
            label: 'Maintenance windows',
            href: '/settings/alerts/maintenance-windows',
          },
          {
            id: 'alerts-entity-risk-score',
            label: 'Entity risk score',
            href: '/settings/alerts/entity-risk-score',
          },
          {
            id: 'alerts-entity-store',
            label: 'Entity store',
            href: '/settings/alerts/entity-store',
          },
        ],
      },
      {
        id: 'machine_learning',
        label: 'Machine learning',
        items: [
          {
            id: 'ml-overview',
            label: 'Overview',
            href: '/settings/ml/overview',
          },
          {
            id: 'ml-anomaly-detection',
            label: 'Anomaly detection jobs',
            href: '/settings/ml/anomaly-detection',
          },
          {
            id: 'ml-data-frame',
            label: 'Data frame analytics jobs',
            href: '/settings/ml/data-frame',
          },
          {
            id: 'ml-trained-models',
            label: 'Trained models',
            href: '/settings/ml/trained-models',
          },
        ],
      },
      {
        id: 'gen_ai',
        label: 'Gen AI',
        items: [
          {
            id: 'gen-ai-settings',
            label: 'General AI settings',
            href: '/settings/gen-ai/settings',
          },
          {
            id: 'gen-ai-assistant',
            label: 'AI assistant',
            href: '/settings/gen-ai/assistant',
          },
        ],
      },
      {
        id: 'assets',
        label: 'Assets',
        items: [
          {
            id: 'assets-saved-objects',
            label: 'Saved objects',
            href: '/settings/assets/saved-objects',
          },
          {
            id: 'assets-files',
            label: 'Files',
            href: '/settings/assets/files',
          },
          { id: 'assets-tags', label: 'Tags', href: '/settings/assets/tags' },
          {
            id: 'assets-reports',
            label: 'Reports',
            href: '/settings/assets/reports',
          },
        ],
      },
      {
        id: 'platform',
        label: 'Platform',
        items: [
          {
            id: 'platform-ai-assistant',
            label: 'AI assistant',
            href: '/settings/platform/ai-assistant',
          },
          {
            id: 'platform-advanced-settings',
            label: 'Advanced settings',
            href: '/settings/platform/advanced-settings',
          },
        ],
      },
    ],
  },
];
