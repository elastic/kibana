/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getWorkflowYamlFromSnapshot } from './get_workflow_yaml_from_snapshot';

describe('getWorkflowYamlFromSnapshot', () => {
  it('returns workflow yaml from snapshot', () => {
    expect(
      getWorkflowYamlFromSnapshot({
        workflow: { yaml: 'name: test\n' },
      })
    ).toBe('name: test\n');
  });

  it('returns empty string for invalid snapshot', () => {
    expect(getWorkflowYamlFromSnapshot(null)).toBe('');
    expect(getWorkflowYamlFromSnapshot(undefined)).toBe('');
    expect(getWorkflowYamlFromSnapshot('invalid')).toBe('');
    expect(getWorkflowYamlFromSnapshot({ workflow: { yaml: 123 } })).toBe('');
  });
});
