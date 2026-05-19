/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { QueryClient } from '@kbn/react-query';
import { QueryClientProvider } from '@kbn/react-query';
/**
 * Shared React Query client for content list queries.
 *
 * Uses conservative defaults:
 * - No automatic retries (errors surface immediately).
 * - Standard stale time and cache time.
 */
export declare const contentListQueryClient: QueryClient;
export { QueryClientProvider };
