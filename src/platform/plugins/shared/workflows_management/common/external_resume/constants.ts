/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const EXTERNAL_RESUME_API_PATH =
  '/api/workflows/executions/{executionId}/resume/external' as const;

export const DEFAULT_EXTERNAL_RESUME_TTL = '1h' as const;

export const MAX_EXTERNAL_RESUME_TTL_MS = 24 * 60 * 60 * 1000;
