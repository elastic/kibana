/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  ALERTZERO_ATTACK_DISCOVERY_REVIEW_WORKFLOW,
  ALERTZERO_ATTACK_DISCOVERY_WORKER_WORKFLOW,
} from '.';
import { describeCloseReports } from './worker_reports.test_helpers';

/**
 * The Attack Discovery Worker's Investigation close reports. `attack_discovery_workflows.test.ts`
 * renders the rest of its reports.
 */

describe('Attack Discovery Worker close reports', () => {
  describeCloseReports({
    closeReports: [
      {
        closeReason: 'false_positive',
        closeStep: 'close_investigation_false_positive',
        definition: ALERTZERO_ATTACK_DISCOVERY_REVIEW_WORKFLOW,
        reportStep: 'report_investigation_closed_false_positive',
      },
      {
        closeReason: 'other',
        closeStep: 'close_investigation_declined',
        definition: ALERTZERO_ATTACK_DISCOVERY_REVIEW_WORKFLOW,
        reportStep: 'report_investigation_closed_declined',
      },
    ],
    definitions: [
      ALERTZERO_ATTACK_DISCOVERY_WORKER_WORKFLOW,
      ALERTZERO_ATTACK_DISCOVERY_REVIEW_WORKFLOW,
    ],
  });
});
