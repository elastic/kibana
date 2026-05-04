/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  DATASTREAM_TYPE_FIELD,
  HOST_NAME_FIELD,
  IGNORED_FIELD,
  LOG_LEVEL_FIELD,
  MESSAGE_FIELD,
  SERVICE_NAME_FIELD,
} from '@kbn/discover-utils';
import type { LogsDataSourceProfileProvider } from '../profile';

export const getDeepAnalysisPlaybook: LogsDataSourceProfileProvider['profile']['getDeepAnalysisPlaybook'] =
  () => () => ({
    shapeId: 'logs',
    shapeLabel: 'Application & infrastructure logs',
    characteristicFields: [
      LOG_LEVEL_FIELD,
      MESSAGE_FIELD,
      SERVICE_NAME_FIELD,
      HOST_NAME_FIELD,
      DATASTREAM_TYPE_FIELD,
      IGNORED_FIELD,
    ],
    promptAddendum:
      'This dataset is logs. Prefer STATS BY log.level, service.name, host.name, ' +
      'data_stream.type. Never group by message. Surface error/warn frequency over ' +
      'time and shifts in level distribution across services and hosts.',
    interestingSignals: [
      'spikes in log.level=error or warn',
      'new service.name values in the time window',
      '_ignored field non-empty rows (parse failures)',
    ],
  });
