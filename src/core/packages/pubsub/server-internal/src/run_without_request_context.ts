/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { AsyncLocalStorage } from 'async_hooks';

/**
 * Runs `fn` with the async stores from module load, not the caller's.
 * Taken before any request is in flight so handlers do not inherit the
 * publisher's user, space, or session.
 */
export const runWithoutRequestContext = AsyncLocalStorage.snapshot();
