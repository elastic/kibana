/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataSourceProfileProvider } from '../../../..';
import {
  TIMESTAMP_FIELD,
  SERVICE_NAME_FIELD,
  TRANSACTION_NAME_FIELD,
  SPAN_NAME_FIELD,
  TRANSACTION_DURATION_FIELD,
  SPAN_DURATION_FIELD,
  EVENT_OUTCOME_FIELD,
} from '../../../../../../common/data_types/logs/constants';

export const getDefaultAppState: DataSourceProfileProvider['profile']['getDefaultAppState'] =
  (prev) => (params) => ({
    ...prev(params),

    columns: [
      { name: TIMESTAMP_FIELD, width: 212 },
      { name: SERVICE_NAME_FIELD },
      { name: TRANSACTION_NAME_FIELD },
      { name: SPAN_NAME_FIELD },
      { name: TRANSACTION_DURATION_FIELD },
      { name: SPAN_DURATION_FIELD },
      { name: EVENT_OUTCOME_FIELD },
    ],
    rowHeight: 1,
  });
