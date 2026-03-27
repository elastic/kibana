/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { HttpSetup } from '@kbn/core/public';

/**
 * Thin, context-free API helpers for workflow CRUD operations.
 * These can be used outside of Redux or React Query contexts
 * (e.g. in attachment renderers).
 */

export const createWorkflow = (http: HttpSetup, yaml: string) =>
  http.post('/api/workflows', {
    body: JSON.stringify({ yaml }),
  });

export const updateWorkflow = (http: HttpSetup, id: string, yaml: string) =>
  http.put<void>(`/api/workflows/${id}`, {
    body: JSON.stringify({ yaml }),
  });
