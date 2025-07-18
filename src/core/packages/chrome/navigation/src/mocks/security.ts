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
  label: 'Security',
  logoType: 'logoSecurity',
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
    id: 'rules',
    label: 'Rules',
    iconType: 'info',
    href: '/rules',
    sections: [
      {
        id: 'management',
        label: 'Management',
        items: [
          {
            id: 'detection-rules',
            label: 'Detection rules (SIEM)',
            href: '/rules/management/detection-rules',
          },
          {
            id: 'benchmarks',
            label: 'Benchmarks',
            href: '/rules/management/benchmarks',
          },
          {
            id: 'shared-exceptions',
            label: 'Shared exceptions lists',
            href: '/rules/management/shared-exceptions',
          },
          {
            id: 'siem-rule-migrations',
            label: 'SIEM rule migrations',
            href: '/rules/management/siem-rule-migrations',
          },
        ],
      },
      {
        id: 'discover',
        label: 'Discover',
        items: [
          {
            id: 'mitre',
            label: 'MITRE ATT&CK®',
            href: '/rules/discover/mitre',
          },
        ],
      },
    ],
  },
  {
    id: 'coverage',
    label: 'Coverage',
    iconType: 'visGauge',
    href: '/coverage',
  },
  {
    id: 'alerts',
    label: 'Alerts',
    iconType: 'bell',
    href: '/alerts',
  },
  {
    id: 'attack_discovery',
    label: 'Attack discovery',
    iconType: 'lensApp',
    href: '/attack-discovery',
  },
  {
    id: 'findings',
    label: 'Findings',
    iconType: 'reportingApp',
    href: '/findings',
  },
  {
    id: 'cases',
    label: 'Cases',
    iconType: 'casesApp',
    href: '/cases',
  },
  {
    id: 'investigations',
    label: 'Investigations',
    iconType: 'casesApp',
    href: '/investigations',
    sections: [
      {
        id: 'investigations-section',
        label: null,
        items: [
          {
            id: 'investigations-timelines',
            label: 'Timelines',
            href: '/investigations/timelines',
          },
          {
            id: 'investigations-notes',
            label: 'Notes',
            href: '/investigations/notes',
          },
          {
            id: 'investigations-osquery',
            label: 'Osquery',
            href: '/investigations/osquery',
          },
        ],
      },
    ],
  },
  {
    id: 'intelligence',
    label: 'Intelligence',
    iconType: 'securityAnalyticsApp',
    href: '/intelligence',
  },
  {
    id: 'explore',
    label: 'Explore',
    iconType: 'search',
    href: '/explore',
    sections: [
      {
        id: 'explore-section',
        label: null,
        items: [
          {
            id: 'hosts',
            label: 'Hosts',
            href: '/explore/hosts',
          },
          {
            id: 'network',
            label: 'Network',
            href: '/explore/network',
          },
          {
            id: 'users',
            label: 'Users',
            href: '/explore/users',
          },
        ],
      },
    ],
  },
  {
    id: 'assets',
    label: 'Assets',
    iconType: 'indexManagementApp',
    href: '/assets',
    sections: [
      {
        id: 'fleet',
        label: 'Fleet',
        items: [
          {
            id: 'agents',
            label: 'Agents',
            href: '/assets/fleet/agents',
          },
          {
            id: 'policies',
            label: 'Policies',
            href: '/assets/fleet/policies',
          },
          {
            id: 'enrollment-tokens',
            label: 'Enrollment tokens',
            href: '/assets/fleet/enrollment-tokens',
          },
          {
            id: 'uninstall-tokens',
            label: 'Uninstall tokens',
            href: '/assets/fleet/uninstall-tokens',
          },
          {
            id: 'data-streams',
            label: 'Data streams',
            href: '/assets/fleet/data-streams',
          },
          {
            id: 'settings',
            label: 'Settings',
            href: '/assets/fleet/settings',
          },
        ],
      },
      {
        id: 'endpoints',
        label: 'Endpoints',
        items: [
          {
            id: 'endpoints-list',
            label: 'Endpoints',
            href: '/assets/endpoints/list',
          },
          {
            id: 'endpoint-policies',
            label: 'Policies',
            href: '/assets/endpoints/policies',
          },
          {
            id: 'trusted-applications',
            label: 'Trusted applications',
            href: '/assets/endpoints/trusted-applications',
          },
          {
            id: 'event-filters',
            label: 'Event filters',
            href: '/assets/endpoints/event-filters',
          },
          {
            id: 'host-isolation-exceptions',
            label: 'Host isolation exceptions',
            href: '/assets/endpoints/host-isolation-exceptions',
          },
          {
            id: 'blocklist',
            label: 'Blocklist',
            href: '/assets/endpoints/blocklist',
          },
          {
            id: 'response-actions-history',
            label: 'Response actions history',
            href: '/assets/endpoints/response-actions-history',
          },
        ],
      },
    ],
  },
  {
    id: 'machine_learning',
    label: 'Machine learning',
    iconType: 'machineLearningApp',
    href: '/ml/overview',
    sections: [
      {
        id: 'ml-section-1',
        label: null,
        items: [
          {
            id: 'overview',
            label: 'Overview',
            href: '/ml/overview',
          },
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
            id: 'single-metric-viewer',
            label: 'Single metric viewer',
            href: '/ml/anomaly-detection/single-metric-viewer',
          },
        ],
      },
      {
        id: 'data-frame-analytics',
        label: 'Data frame analytics',
        items: [
          {
            id: 'result-explorer',
            label: 'Result explorer',
            href: '/ml/data-frame-analytics/result-explorer',
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
