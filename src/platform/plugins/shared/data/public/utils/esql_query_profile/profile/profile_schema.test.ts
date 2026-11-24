/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { PHASE_NANOS_FIELDS, PLANNING_PHASE_IDS } from './profile_schema';

/**
 * These are read from the schema that Elasticsearch publishes for the profile, so a new version of
 * the package can change them. When one of these tests fails after an update, Elasticsearch added,
 * renamed or removed a field: check that the profile view still reads it correctly.
 */
describe('what the profile view reads from the ES|QL profile schema', () => {
  it('takes the planning phases from the time spans of the profile, not from its totals', () => {
    expect(PLANNING_PHASE_IDS).toEqual(expect.arrayContaining(['parsing', 'analysis']));
    expect(PLANNING_PHASE_IDS).not.toContain('query');
    expect(PLANNING_PHASE_IDS).not.toContain('planning');
    expect(PLANNING_PHASE_IDS).not.toContain('drivers');
    expect(PLANNING_PHASE_IDS).not.toContain('planning_cpu_nanos');
  });

  it('sums the timing fields of the operators that report no process time', () => {
    // A new field here has to be a phase of its own. If it is a part of another one, summing it
    // counts that time twice. `plan_nanos` and `gather_nanos` are the two stretches of work that the
    // fetch operator does on the driver thread, one after the other. The wait for the nodes to
    // answer is not in them.
    expect([...PHASE_NANOS_FIELDS].sort()).toEqual([
      'aggregation_finish_nanos',
      'aggregation_nanos',
      'collect_nanos',
      'emit_nanos',
      'gather_nanos',
      'hash_nanos',
      'plan_nanos',
      'receive_nanos',
    ]);
  });
});
