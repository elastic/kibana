/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { TraceFields } from '../../..';
import * as constants from '../constants';

const AVAILABLE_TRACE_FIELDS = [
  constants.SERVICE_NAME_FIELD,
  constants.EVENT_OUTCOME_FIELD,
  constants.TRANSACTION_NAME_FIELD,
  constants.TRANSACTION_DURATION_FIELD,
  constants.SPAN_NAME_FIELD,
  constants.SPAN_DURATION_FIELD,
] as const;

export const getAvailableTraceFields = (traceDoc: TraceFields) =>
  AVAILABLE_TRACE_FIELDS.filter((fieldName) => Boolean(traceDoc[fieldName]));
