/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DEFAULT_LOGS_PROFILE, IGNORED_FIELD, MESSAGE_FIELD } from '@kbn/discover-utils';
import type { LogsDataSourceProfileProvider } from '../profile';

const GROUPABLE_LOG_FIELDS = DEFAULT_LOGS_PROFILE.recommendedFields.filter(
  (field) => field !== MESSAGE_FIELD
);

export const getDeepAnalysisPlaybook: LogsDataSourceProfileProvider['profile']['getDeepAnalysisPlaybook'] =
  () => () => ({
    shapeId: 'logs',
    shapeLabel: 'Application & infrastructure logs',
    characteristicFields: [...DEFAULT_LOGS_PROFILE.recommendedFields, IGNORED_FIELD],
    guidance:
      `This dataset is logs. Prefer STATS BY ${GROUPABLE_LOG_FIELDS.join(', ')}. ` +
      'Never group by message. Surface error/warn frequency over time and ' +
      'shifts in level distribution across services and hosts.',
    interestingSignals: [
      'spikes in log.level=error or warn',
      'new service.name values in the time window',
      '_ignored field non-empty rows (parse failures)',
    ],
  });
