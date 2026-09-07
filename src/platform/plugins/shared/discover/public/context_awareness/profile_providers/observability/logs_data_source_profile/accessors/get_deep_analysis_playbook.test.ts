/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EMPTY_CONTEXT_AWARENESS_TOOLKIT } from '../../../..';
import { getDeepAnalysisPlaybook } from './get_deep_analysis_playbook';

describe('getDeepAnalysisPlaybook (logs)', () => {
  it('returns a logs shape contribution with characteristic fields and guidance', () => {
    // The accessor ignores both prev and context, so we pass minimal stubs.
    const accessor = getDeepAnalysisPlaybook!(() => undefined, {
      context: {} as never,
      toolkit: EMPTY_CONTEXT_AWARENESS_TOOLKIT,
    });
    const result = accessor({ dataView: undefined, query: undefined });

    expect(result).toBeDefined();
    expect(result?.shapeId).toBe('logs');
    expect(result?.shapeLabel).toMatch(/logs/i);
    expect(result?.characteristicFields).toEqual(
      expect.arrayContaining(['log.level', 'message', 'service.name', 'host.name'])
    );
    expect(result?.guidance).toContain('STATS BY');
    expect(result?.guidance.length).toBeLessThanOrEqual(600);
    expect(result?.interestingSignals).toEqual(
      expect.arrayContaining([expect.stringContaining('error')])
    );
    expect((result?.interestingSignals ?? []).length).toBeLessThanOrEqual(5);
  });
});
