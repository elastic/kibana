/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { assertInvariants } from './invariants';
import type { State } from './state';
import * as DONE from './steps/done';
import * as FATAL from './steps/fatal';

// TODO(v3-stress-test): build minimal valid State fixtures for V2-port states.
describe.skip('v3 migration invariants (stress-test POC)', () => {
  it('rejects states that violate base invariants', () => {
    expect(() =>
      assertInvariants({
        name: DONE.Name,
        retryAttempts: 1,
        retryCount: 2,
        logs: [],
        targetIndex: '.kibana_1_v3',
      } as unknown as State)
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
      } as unknown as State)
    ).toThrowErrorMatchingInlineSnapshot(`"Invalid v3 migration state: FATAL requires reason"`);
  });
});
