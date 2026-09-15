/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parseWorkflowDurationMs } from './parse_workflow_duration';

describe('parseWorkflowDurationMs', () => {
  it.each([
    ['5s', 5000],
    ['1m', 60_000],
    ['500ms', 500],
    ['2h', 7_200_000],
  ] as const)('parses %s', (input, expected) => {
    expect(parseWorkflowDurationMs(input)).toBe(expected);
  });

  it('returns null for invalid input', () => {
    expect(parseWorkflowDurationMs('nope')).toBeNull();
    expect(parseWorkflowDurationMs(undefined)).toBeNull();
  });
});
