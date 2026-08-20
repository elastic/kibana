/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expect } from '@kbn/scout/ui';

/**
 * Waits until `network.trackMatchingRequests`' counter reaches `expected`. Gating on
 * the counter keeps waits and assertions on one matcher by construction, which a
 * separate `page.waitForResponse` predicate cannot guarantee.
 */
export const waitForRequestCount = (getCount: () => number, expected: number) =>
  expect.poll(getCount, { timeout: 30_000, intervals: [250] }).toBeGreaterThanOrEqual(expected);
