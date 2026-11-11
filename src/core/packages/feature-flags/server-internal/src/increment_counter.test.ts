/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { NOOP_PROVIDER, StandardResolutionReasons } from '@openfeature/server-sdk';
import { isFallbackReason } from './increment_counter';

describe('isFallbackReason', () => {
  test('treats errors as fallbacks', () => {
    expect(isFallbackReason(StandardResolutionReasons.ERROR)).toBe(true);
  });

  test('treats the NOOP provider reason as a fallback', async () => {
    const { reason } = await NOOP_PROVIDER.resolveBooleanEvaluation('my-flag', false);
    expect(isFallbackReason(reason)).toBe(true);
  });

  test.each([
    StandardResolutionReasons.TARGETING_MATCH,
    StandardResolutionReasons.DEFAULT,
    StandardResolutionReasons.CACHED,
    StandardResolutionReasons.STATIC,
    undefined,
  ])('does not treat %s as a fallback', (reason) => {
    expect(isFallbackReason(reason)).toBe(false);
  });
});
