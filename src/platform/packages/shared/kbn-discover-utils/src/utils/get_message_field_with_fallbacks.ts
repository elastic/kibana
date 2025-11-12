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
  fieldConstants.MESSAGE_FIELD,
  fieldConstants.ERROR_MESSAGE_FIELD,
  fieldConstants.EVENT_ORIGINAL_FIELD,
  fieldConstants.EXCEPTION_MESSAGE_FIELD,
  fieldConstants.ERROR_EXCEPTION_MESSAGE,
  fieldConstants.OTEL_ATTRIBUTES_EXCEPTION_MESSAGE,
] as const;

export const getMessageFieldWithFallbacks = (
  doc: LogDocumentOverview,
  { includeFormattedValue = false }: { includeFormattedValue?: boolean } = {}
) => {
  return getLogFieldWithFallback(doc, rankingOrder, includeFormattedValue);
};
