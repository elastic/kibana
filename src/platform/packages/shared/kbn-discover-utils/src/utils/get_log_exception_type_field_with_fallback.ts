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

const rankingOrder = [
  fieldConstants.OTEL_EXCEPTION_TYPE_FIELD,
  fieldConstants.ERROR_EXCEPTION_TYPE_FIELD,
] as const;

export const getLogExceptionTypeFieldWithFallback = (
  doc: Record<string, unknown> | LogDocumentOverview
) => {
  return getLogFieldWithFallback(doc, rankingOrder, { includeOriginalValue: true });
};
