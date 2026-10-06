/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { HttpSetup } from '@kbn/core/public';
export { createProjectFetcher } from './project_fetcher';
/**
 * Resolves the default project routing for the current space.
 * Returns {@link PROJECT_ROUTING.ALL} when the expression doesn't exist (404).
 */
export declare const fetchDefaultProjectRouting: (http: HttpSetup) => Promise<string>;
