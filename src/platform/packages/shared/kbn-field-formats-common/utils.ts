/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { MISSING_TOKEN } from './constants';

/**
 * True when a value carries no data: an absent field, an explicit null, or the sentinel
 * Elasticsearch aggregations use for a missing bucket. These are the values rendered as
 * NULL_PLACEHOLDER in tables and Discover and as NULL_LABEL everywhere else.
 * Narrows the argument so later code can treat the value as present.
 */
export const isMissingValue = (value: unknown): value is null | undefined | typeof MISSING_TOKEN =>
  value == null || value === MISSING_TOKEN;
