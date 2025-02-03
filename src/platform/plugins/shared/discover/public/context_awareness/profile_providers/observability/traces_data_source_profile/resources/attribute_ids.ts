/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  SPAN_NAME,
  SERVICE,
  TRANSACTION_NAME,
  TRACE_ID,
  SPAN_DESTINATION_SERVICE_RESOURCE,
  TIMESTAMP_US,
  SPAN_DURATION,
  TRANSACTION_DURATION,
  HTTP_RESPONSE_STATUS_CODE,
} from '@kbn/apm-types';

export const spanAttributeIds = [
  SPAN_NAME,
  SERVICE,
  TRANSACTION_NAME,
  TRACE_ID,
  SPAN_DESTINATION_SERVICE_RESOURCE,
  TIMESTAMP_US,
  SPAN_DURATION,
  'type_and_subtype',
];
export const transactionAttributeIds = [
  TRANSACTION_NAME,
  SERVICE,
  TRACE_ID,
  TIMESTAMP_US,
  TRANSACTION_DURATION,
  HTTP_RESPONSE_STATUS_CODE,
  'user_agent_and_version',
];
