/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod';

import {
  HUMAN_READABLE_ID_MIN_LENGTH,
  HUMAN_READABLE_ID_MAX_LENGTH,
  HUMAN_READABLE_ID_PATTERN,
} from './constants';

/** Zod schema for a human-readable slug identifier (3-255 lowercase alphanumeric + hyphens). */
export const humanReadableIdSchema = z
  .string()
  .min(HUMAN_READABLE_ID_MIN_LENGTH)
  .max(HUMAN_READABLE_ID_MAX_LENGTH)
  .regex(HUMAN_READABLE_ID_PATTERN);
