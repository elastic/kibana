/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { OxlintOverride } from 'oxlint';

export const alertingV2Overrides: OxlintOverride[] = [
  /**
   * Alerting V2 rule form — require compressed prop on EUI form controls
   */
  {
    files: ['x-pack/platform/packages/shared/response-ops/alerting-v2-rule-form/**/*.{ts,tsx}'],
    rules: {
      '@kbn/alerting-v2/require_eui_form_compressed': 'error',
    },
  },
];
