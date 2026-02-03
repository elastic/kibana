/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { fieldConstants } from '..';
import type { LogDocumentOverview } from '../types';
import { getLogFieldWithFallback } from './get_log_field_with_fallback';

// First check otel event_name field, then fallback to processor.event
// OTEL exceptions with trace processor are stored as processor.event: error
const rankingOrder = [
  fieldConstants.OTEL_EVENT_NAME_FIELD,
  fieldConstants.PROCESSOR_EVENT_FIELD,
] as const;

export const getLogEventTypeFieldWithFallback = (doc: LogDocumentOverview) => {
  return getLogFieldWithFallback(doc, rankingOrder);
};
