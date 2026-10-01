/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// TEMP: failing tests to exercise Post-Build failed test reporting
it('fails on every attempt', () => {
  expect('reported').toBe('a failure on every attempt');
});

it('fails only on the first attempt', () => {
  expect(process.env.BUILDKITE_RETRY_COUNT).not.toBe('0');
});
