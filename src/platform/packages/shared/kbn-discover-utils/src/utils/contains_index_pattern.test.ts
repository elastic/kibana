/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DEFAULT_ALLOWED_TRACES_BASE_PATTERNS_REGEXP } from '../data_types/traces/traces_context_service';
import { containsIndexPattern } from './contains_index_pattern';

describe('containsIndexPattern', () => {
  const allowed = [DEFAULT_ALLOWED_TRACES_BASE_PATTERNS_REGEXP, 'custom-*'];
  const isTraceIndex = containsIndexPattern(allowed);

  const testCases: Array<[string, boolean]> = [
    ['traces-*', true],
    ['logs-*', false],
    ['custom-*', true],
    ['otel-*,apm-*,traces-apm*,traces-*.otel-*', true],
    [
      'remote_cluster:apm-*,remote_cluster:traces-apm*,remote_cluster:traces-*.otel-*,apm-*,traces-apm*,traces-*.otel-*',
      true,
    ],
    [
      'remote_cluster:filebeat-*,remote_cluster:logs-*,remote_cluster:kibana_sample_data_logs*,filebeat-*,kibana_sample_data_logs*,logs-*',
      false,
    ],
  ];

  it.each(testCases)('Evaluates a traces index "%s" as %p', (index, expected) => {
    expect(isTraceIndex(index)).toBe(expected);
  });
});
