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
import { getFieldWithFallback } from './get_field_with_fallback';

export const getLogLevelFieldWithFallback = (doc: LogDocumentOverview) => {
  const rankingOrder = [
    fieldConstants.LOG_LEVEL_FIELD,
    fieldConstants.ERROR_LOG_LEVEL_FIELD,
  ] as const;

  return getFieldWithFallback(doc, rankingOrder);
};
