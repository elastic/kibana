/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { validateSemantics } from './validate_semantics';

const baseWorkflow = {
  version: '1',
  name: 'Test Workflow',
  enabled: true,
  triggers: [{ type: 'manual' }],
};

describe('validateSemantics', () => {
  it('returns no issues for a valid workflow with unique step names', () => {
    const issues = validateSemantics({
      ...baseWorkflow,
      steps: [
        { name: 'step1', type: 'console' },
        { name: 'step2', type: 'console' },
      ],
    });
    expect(issues).toEqual([]);
  });

  it('reports a step-name issue for duplicate step names', () => {
    const issues = validateSemantics({
      ...baseWorkflow,
      steps: [
        { name: 'dup', type: 'console' },
        { name: 'dup', type: 'console' },
      ],
    });
    expect(issues.some((issue) => issue.source === 'step-name')).toBe(true);
  });

  it('never throws on structurally odd input', () => {
    expect(() => validateSemantics({})).not.toThrow();
    expect(Array.isArray(validateSemantics({}))).toBe(true);
  });
});
