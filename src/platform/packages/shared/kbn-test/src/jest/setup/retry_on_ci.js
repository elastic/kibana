/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/* eslint-env jest */

// Jest has no `retryTimes` config option: retries can only be enabled through the runtime API,
// and it has to run from a `setupFilesAfterEnv` file so that it applies to every test file.
// Retrying absorbs one-off process stalls (GC pauses, agent contention) that push otherwise
// sub-second tests past the per-test timeout on CI. Tests that fail on every attempt still fail.
jest.retryTimes(3, { logErrorsBeforeRetry: true });
