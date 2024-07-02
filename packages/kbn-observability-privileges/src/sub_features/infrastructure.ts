/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
// import { metricsDataSourceSavedObjectName } from '@kbn/metrics-data-access-plugin/server';
import { INFRA_RULE_TYPES } from '@kbn/rule-data-utils';

// server side metrics-data-access plugin constants cannot be imported in the common package. Need to move the constants to a common package.
const metricsDataSourceSavedObjectName = 'metrics-data-source';

export const INFRA_APP_ID = 'infra';
export const METRICS_APP_ID = 'metrics';
export const LOGS_FEATURE_ID = 'logs';

export const INFRA_SUB_FEATURE = {
  groupType: 'mutually_exclusive',
  privileges: [
    {
      id: 'infrastructure_all',
      name: 'All',
      includeIn: 'all',
      app: [INFRA_APP_ID, METRICS_APP_ID],
      catalogue: ['infraops', METRICS_APP_ID],
      api: ['infra', 'rac'],
      savedObject: {
        all: ['infrastructure-ui-source', metricsDataSourceSavedObjectName],
        read: ['index-pattern'],
      },
      alerting: {
        rule: {
          all: INFRA_RULE_TYPES,
        },
        alert: {
          all: INFRA_RULE_TYPES,
        },
      },
      management: {
        insightsAndAlerting: ['triggersActions'],
      },
      ui: ['infra:show', 'infra:configureSource', 'infra:save'],
    },
    {
      id: 'infrastructure_read',
      name: 'Read',
      includeIn: 'read',
      app: [INFRA_APP_ID, METRICS_APP_ID],
      catalogue: ['infraops', METRICS_APP_ID],
      api: ['infra', 'rac'],
      savedObject: {
        all: [],
        read: ['infrastructure-ui-source', 'index-pattern', metricsDataSourceSavedObjectName],
      },
      alerting: {
        rule: {
          read: INFRA_RULE_TYPES,
        },
        alert: {
          read: INFRA_RULE_TYPES,
        },
      },
      management: {
        insightsAndAlerting: ['triggersActions'],
      },
      ui: ['infra:show'],
    },
  ],
};
