/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { APM_RULE_TYPES } from '@kbn/rule-data-utils';
import { APM_SO_TYPES } from '../saved_objects';

export const APM_APP_ID = 'apm';
export const UX_APP_ID = 'ux';

export const APM_SUB_FEATURE = {
  groupType: 'mutually_exclusive',
  privileges: [
    {
      id: 'apm_all',
      name: 'All',
      includeIn: 'all',
      app: [APM_APP_ID, UX_APP_ID],
      catalogue: [APM_APP_ID],
      api: [APM_APP_ID, 'apm_write', 'rac'],
      savedObject: {
        all: APM_SO_TYPES,
        read: [],
      },
      alerting: {
        rule: {
          all: APM_RULE_TYPES,
        },
        alert: {
          all: APM_RULE_TYPES,
        },
      },
      management: {
        insightsAndAlerting: ['triggersActions'],
      },
      ui: ['apm:show', 'apm:save', 'apm:alerting:show', 'apm:alerting:save'],
    },
    {
      id: 'apm_read',
      name: 'Read',
      includeIn: 'read',
      app: [APM_APP_ID, UX_APP_ID],
      catalogue: [APM_APP_ID],
      api: [APM_APP_ID, 'rac'],
      savedObject: {
        all: [],
        read: APM_SO_TYPES,
      },
      alerting: {
        rule: {
          read: APM_RULE_TYPES,
        },
        alert: {
          read: APM_RULE_TYPES,
        },
      },
      management: {
        insightsAndAlerting: ['triggersActions'],
      },
      ui: ['apm:show', 'apm:alerting:show'],
    },
  ],
};
