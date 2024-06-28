/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DEFAULT_APP_CATEGORIES } from '@kbn/core/server';
import {
  ApmRuleType,
  ES_QUERY_ID,
  ML_ANOMALY_DETECTION_RULE_TYPE_ID,
  METRIC_INVENTORY_THRESHOLD_ALERT_TYPE_ID,
  OBSERVABILITY_THRESHOLD_RULE_TYPE_ID,
  UPTIME_SYNTHETICS_RULE_TYPES,
  SLO_RULE_TYPES,
  INFRA_RULE_TYPES,
} from '@kbn/rule-data-utils';
import { i18n } from '@kbn/i18n';
import {
  SYNTHETICS_SUB_FEATURE,
  SYNTHETICS_ELASTIC_MANAGED_LOCATIONS_SUB_FEATURE,
  SYNTHETICS_APP_ID,
  UPTIME_APP_ID,
  SLO_APP_ID,
  UX_APP_ID,
  APM_APP_ID,
  INFRA_APP_ID,
  SLO_SUB_FEATURE,
  APM_SUB_FEATURE,
  INFRA_SUB_FEATURE,
  METRICS_APP_ID,
  AI_ASSISTANT_APP_ID,
  AI_ASSISTANT_SUB_FEATURE,
} from './sub_features';

export const OBSERVABILITY_FEATURE_ID = 'observability';

const O11Y_RULE_TYPES = [
  OBSERVABILITY_THRESHOLD_RULE_TYPE_ID,
  ES_QUERY_ID,
  ML_ANOMALY_DETECTION_RULE_TYPE_ID,
  METRIC_INVENTORY_THRESHOLD_ALERT_TYPE_ID,
  ...Object.values(ApmRuleType),
];

const ALL_RULE_TYPES = [
  ...O11Y_RULE_TYPES,
  ...UPTIME_SYNTHETICS_RULE_TYPES,
  ...SLO_RULE_TYPES,
  ...INFRA_RULE_TYPES,
];

const ALL_APPS = [
  OBSERVABILITY_FEATURE_ID,
  UPTIME_APP_ID,
  SYNTHETICS_APP_ID,
  SLO_APP_ID,
  APM_APP_ID,
  UX_APP_ID,
  INFRA_APP_ID,
  METRICS_APP_ID,
  AI_ASSISTANT_APP_ID,
];

export const OBSERVABILITY_FEATURE = {
  id: OBSERVABILITY_FEATURE_ID,
  name: i18n.translate('xpack.observability.nameFeatureTitle', {
    defaultMessage: 'Observability',
  }),
  order: 1000,
  category: DEFAULT_APP_CATEGORIES.observability,
  app: ALL_APPS,
  catalogue: [...ALL_APPS, 'infraops'],
  alerting: ALL_RULE_TYPES,
  management: {
    insightsAndAlerting: ['triggersActions'],
  },
  privileges: {
    all: {
      app: [OBSERVABILITY_FEATURE_ID],
      catalogue: [...ALL_APPS, 'infraops'],
      api: ['rac'],
      savedObject: {
        all: [],
        read: [],
      },
      alerting: {
        rule: {
          all: ALL_RULE_TYPES,
        },
        alert: {
          all: ALL_RULE_TYPES,
        },
      },
      ui: ['read', 'write'],
      management: {
        insightsAndAlerting: ['triggersActions'],
      },
    },
    read: {
      app: [OBSERVABILITY_FEATURE_ID],
      catalogue: [...ALL_APPS, 'infraops'],
      api: ['rac'],
      savedObject: {
        all: [],
        read: [],
      },
      alerting: {
        rule: {
          read: ALL_RULE_TYPES,
        },
        alert: {
          read: ALL_RULE_TYPES,
        },
      },
      ui: ['read'],
      management: {
        insightsAndAlerting: ['triggersActions'],
      },
    },
  },
  subFeatures: [
    {
      name: i18n.translate('xpack.observability.subFeatureRegistry.synthetics', {
        defaultMessage: 'Synthetics',
      }),
      privilegeGroups: [SYNTHETICS_SUB_FEATURE, SYNTHETICS_ELASTIC_MANAGED_LOCATIONS_SUB_FEATURE],
    },
    {
      name: i18n.translate('xpack.observability.subFeatureRegistry.slo', {
        defaultMessage: 'SLOs',
      }),
      privilegeGroups: [SLO_SUB_FEATURE],
    },
    {
      name: i18n.translate('xpack.observability.subFeatureRegistry.apm', {
        defaultMessage: 'Applications',
      }),
      privilegeGroups: [APM_SUB_FEATURE],
    },
    {
      name: i18n.translate('xpack.observability.subFeatureRegistry.infra', {
        defaultMessage: 'Infrastructure',
      }),
      privilegeGroups: [INFRA_SUB_FEATURE],
    },
    {
      name: i18n.translate('xpack.observability.subFeatureRegistry.aiAssistant', {
        defaultMessage: 'Observability AI Assistant',
      }),
      privilegeGroups: [AI_ASSISTANT_SUB_FEATURE],
    },
  ],
};
