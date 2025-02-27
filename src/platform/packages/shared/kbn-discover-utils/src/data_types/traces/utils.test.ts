/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DEFAULT_ALLOWED_TRACES_BASE_PATTERNS_REGEXP } from './traces_context_service';
import { combineUnique, containsIndexPattern } from './utils';

describe('combineUnique', () => {
  it('should combine many arrays into one containing only unique values', () => {
    expect(combineUnique(['a', 'b'], ['b', 'c'])).toStrictEqual(['a', 'b', 'c']);
  });
});

describe('containsIndexPattern', () => {
  const allowed = [DEFAULT_ALLOWED_TRACES_BASE_PATTERNS_REGEXP];
  const isTraceIndex = containsIndexPattern(allowed);

  const testCases: Array<[string, boolean]> = [
    ['.traces-default', true],
    ['.logs-default', false],
    ['remote_cluster:.ds-traces-apm.rum-default-2025.02.25-000005,.logs-default', true],
    ['.logs-default,.ds-traces-apm.rum-default-2025.02.25-000005', true],
    ['.logs-default,remote_cluster:.ds-metrics-apm.internal-default-2025.02.25-000002', false],
  ];

  it.each(testCases)('Evaluates index "%s" as %p', (index, expected) => {
    expect(isTraceIndex(index)).toBe(expected);
  });
});
