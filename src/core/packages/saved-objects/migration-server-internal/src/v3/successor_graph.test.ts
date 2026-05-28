/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { fc } from '@fast-check/jest';
import { assertInvariants } from './invariants';
import type { CheckSourceResponse, CreateTargetResponse, MarkReadyResponse } from './io';
import { createInitialState, type State } from './state';
import { SUCCESSORS } from './types';
import { io, transitionCases } from './test_helpers';
import * as CHECK_SOURCE from './steps/check_source';
import * as CREATE_TARGET from './steps/create_target';
import * as INIT from './steps/init';
import * as MARK_READY from './steps/mark_ready';

interface GeneratedTransition {
  readonly from: State;
  readonly to: State;
}

interface GeneratedMarkReadyTransition {
  readonly from: MARK_READY.State;
  readonly to: State;
}

const nonEmptyString = fc.string({ minLength: 1, maxLength: 32 });
const logs = fc.array(fc.string({ maxLength: 32 }), { maxLength: 8 });

const retryFields = fc.nat({ max: 5 }).chain((retryAttempts) =>
  fc.record({
    retryAttempts: fc.constant(retryAttempts),
    retryCount: fc.integer({ min: 0, max: retryAttempts }),
  })
);

const arbInitState = retryFields.map(({ retryAttempts }) => createInitialState(retryAttempts));

const arbCheckSourceState = fc
  .record({
    retryFields,
    logs,
  })
  .map(
    ({ retryFields: { retryAttempts, retryCount }, logs: stateLogs }): CHECK_SOURCE.State => ({
      name: CHECK_SOURCE.Name,
      retryAttempts,
      retryCount,
      logs: stateLogs,
    })
  );

const arbCreateTargetState = fc
  .record({
    retryFields,
    logs,
    sourceIndex: nonEmptyString,
  })
  .map(
    ({
      retryFields: { retryAttempts, retryCount },
      logs: stateLogs,
      sourceIndex,
    }): CREATE_TARGET.State => ({
      name: CREATE_TARGET.Name,
      retryAttempts,
      retryCount,
      logs: stateLogs,
      sourceIndex,
    })
  );

const arbMarkReadyState = fc
  .record({
    retryFields,
    logs,
    targetIndex: nonEmptyString,
  })
  .map(
    ({
      retryFields: { retryAttempts, retryCount },
      logs: stateLogs,
      targetIndex,
    }): MARK_READY.State => ({
      name: MARK_READY.Name,
      retryAttempts,
      retryCount,
      logs: stateLogs,
      targetIndex,
    })
  );

const arbCheckSourceResponse = fc.oneof(
  nonEmptyString.map(
    (sourceIndex): CheckSourceResponse => ({
      type: 'source_found',
      sourceIndex,
    })
  ),
  nonEmptyString.map(
    (reason): CheckSourceResponse => ({
      type: 'source_missing',
      reason,
    })
  )
);

const arbCreateTargetResponse = fc.oneof(
  nonEmptyString.map(
    (targetIndex): CreateTargetResponse => ({
      type: 'target_created',
      targetIndex,
    })
  ),
  nonEmptyString.map(
    (message): CreateTargetResponse => ({
      type: 'retryable_failure',
      message,
    })
  ),
  nonEmptyString.map(
    (reason): CreateTargetResponse => ({
      type: 'fatal_failure',
      reason,
    })
  )
);

const arbMarkReadyResponse = fc.oneof(
  fc.constant<MarkReadyResponse>({ type: 'ready' }),
  nonEmptyString.map(
    (reason): MarkReadyResponse => ({
      type: 'fatal_failure',
      reason,
    })
  )
);

const arbMarkReadyReadyTransition = arbMarkReadyState.map(
  (from): GeneratedMarkReadyTransition => ({
    from,
    to: MARK_READY.step(from, io).transition({ type: 'ready' }),
  })
);

const arbTransition = fc.oneof(
  arbInitState.map(
    (from): GeneratedTransition => ({
      from,
      to: INIT.step(from, io).transition({ type: 'started' }),
    })
  ),
  arbCheckSourceState.chain((from) =>
    arbCheckSourceResponse.map(
      (response): GeneratedTransition => ({
        from,
        to: CHECK_SOURCE.step(from, io).transition(response),
      })
    )
  ),
  arbCreateTargetState.chain((from) =>
    arbCreateTargetResponse.map(
      (response): GeneratedTransition => ({
        from,
        to: CREATE_TARGET.step(from, io).transition(response),
      })
    )
  ),
  arbMarkReadyState.chain((from) =>
    arbMarkReadyResponse.map(
      (response): GeneratedTransition => ({
        from,
        to: MARK_READY.step(from, io).transition(response),
      })
    )
  )
);

describe('v3 migration successor graph', () => {
  it('snapshots the successor graph', () => {
    expect(SUCCESSORS).toMatchInlineSnapshot(`
      Object {
        "CHECK_SOURCE": Array [
          "CREATE_TARGET",
          "FATAL",
        ],
        "CREATE_TARGET": Array [
          "CREATE_TARGET",
          "MARK_READY",
          "FATAL",
        ],
        "DONE": Array [],
        "FATAL": Array [],
        "INIT": Array [
          "CHECK_SOURCE",
        ],
        "MARK_READY": Array [
          "DONE",
          "FATAL",
        ],
      }
    `);
  });

  it.each(transitionCases)('keeps $title within the successor graph', ({ run }) => {
    const { from, to } = run();

    assertInvariants(to);
    expect(SUCCESSORS[from.name]).toContain(to.name);
  });

  it('keeps generated transitions within the successor graph', () => {
    fc.assert(
      fc.property(arbTransition, ({ from, to }) => {
        assertInvariants(to);
        expect(SUCCESSORS[from.name]).toContain(to.name);
      }),
      { verbose: true, numRuns: 1_000 }
    );
  });

  it('keeps logs append-only across generated transitions', () => {
    fc.assert(
      fc.property(arbTransition, ({ from, to }) => {
        expect(to.logs.length).toBeGreaterThanOrEqual(from.logs.length);
      }),
      { verbose: true, numRuns: 1_000 }
    );
  });

  it('keeps retry budget immutable across generated transitions', () => {
    fc.assert(
      fc.property(arbTransition, ({ from, to }) => {
        expect(to.retryAttempts).toBe(from.retryAttempts);
      }),
      { verbose: true, numRuns: 1_000 }
    );
  });

  it('propagates targetIndex when MARK_READY succeeds', () => {
    fc.assert(
      fc.property(arbMarkReadyReadyTransition, ({ from, to }) => {
        expect(to).toEqual(
          expect.objectContaining({
            targetIndex: from.targetIndex,
          })
        );
      }),
      { verbose: true, numRuns: 1_000 }
    );
  });
});
