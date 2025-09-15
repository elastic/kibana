/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  HTTP_RESPONSE_STATUS_CODE_FIELD,
  SERVICE_NAME_FIELD,
  TIMESTAMP_FIELD,
  TRACE_ID_FIELD,
  USER_AGENT_NAME_FIELD,
  USER_AGENT_VERSION_FIELD,
} from '@kbn/discover-utils';

export const transactionFields = [
  SERVICE_NAME_FIELD,
  TIMESTAMP_FIELD,
  HTTP_RESPONSE_STATUS_CODE_FIELD,
  USER_AGENT_NAME_FIELD,
  USER_AGENT_VERSION_FIELD,
];

export const transactionTraceFields = [TRACE_ID_FIELD];

export const allTransactionFields = [...transactionFields, ...transactionTraceFields];
