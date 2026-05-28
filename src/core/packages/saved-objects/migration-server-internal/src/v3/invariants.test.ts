/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { assertInvariants } from './invariants';
import * as DONE from './steps/done';
import * as FATAL from './steps/fatal';

describe('v3 migration invariants', () => {
  it('rejects states that violate base invariants', () => {
    expect(() =>
      assertInvariants({
        name: DONE.Name,
        retryAttempts: 1,
        retryCount: 2,
        logs: [],
        targetIndex: '.kibana_1_v3',
      })
    ).toThrowErrorMatchingInlineSnapshot(
      `"Invalid v3 migration state: retryCount must not exceed retryAttempts"`
    );
  });

  it('rejects states that violate step-specific invariants', () => {
    expect(() =>
      assertInvariants({
        name: FATAL.Name,
        retryAttempts: 1,
        retryCount: 1,
        logs: [],
        reason: '',
      })
    ).toThrowErrorMatchingInlineSnapshot(`"Invalid v3 migration state: FATAL requires reason"`);
  });
});
