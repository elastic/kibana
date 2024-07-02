/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SLO_RULE_TYPES } from '@kbn/rule-data-utils';
import { SLO_SO_TYPES } from '../saved_objects';

export const SLO_APP_ID = 'slo';

export const SLO_SUB_FEATURE = {
  groupType: 'mutually_exclusive',
  privileges: [
    {
      id: 'slo_all',
      name: 'All',
      includeIn: 'all',
      app: [SLO_APP_ID],
      catalogue: [SLO_APP_ID, 'observability'],
      api: ['slo_write', 'slo_read', 'rac'],
      savedObject: {
        all: SLO_SO_TYPES,
        read: [],
      },
      alerting: {
        rule: {
          all: SLO_RULE_TYPES,
        },
        alert: {
          all: SLO_RULE_TYPES,
        },
      },
      ui: ['slo:read', 'slo:write'],
    },
    {
      id: 'slo_read',
      name: 'Read',
      includeIn: 'read',
      app: [SLO_APP_ID],
      catalogue: [SLO_APP_ID, 'observability'],
      api: ['slo_read', 'rac'],
      savedObject: {
        all: [],
        read: SLO_SO_TYPES,
      },
      alerting: {
        rule: {
          read: SLO_RULE_TYPES,
        },
        alert: {
          read: SLO_RULE_TYPES,
        },
      },
      ui: ['slo:read'],
    },
  ],
};
