/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { SUCCESSORS } from './successors';

describe('v3 successor graph', () => {
  it('matches the SUCCESSORS snapshot', () => {
    expect(SUCCESSORS).toMatchSnapshot();
  });
});

// TODO(v3-stress-test): re-enable transition-case and PBT tests after test_helpers
// covers the V2-port graph — see STRESS_TEST_REPORT.md.
describe.skip('v3 successor graph (transition cases)', () => {
  it.todo('wire transitionCases against the V2-port IO stub');
});
