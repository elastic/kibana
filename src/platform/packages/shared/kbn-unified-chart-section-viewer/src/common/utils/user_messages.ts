/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import type { UserMessage } from '@kbn/lens-plugin/public';

export const LEGACY_HISTOGRAM_USER_MESSAGES: UserMessage[] = [
  {
    uniqueId: 'metrics-experience-histogram-warning',
    severity: 'warning',
    shortMessage: i18n.translate('metricsExperience.userMessage.histogram.short', {
      defaultMessage: 'Histogram warning',
    }),
    longMessage: i18n.translate('metricsExperience.userMessage.histogram.long', {
      defaultMessage:
        'Calculated assuming T-Digest encoding. If the histogram was encoded differently, the data is approximate',
    }),
    fixableInEditor: false,
    displayLocations: [{ id: 'embeddableBadge' }],
  },
];
