/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse } from 'yaml';
import { NIGHTSHIFT_MEMORY_OPTIMIZE_WORKFLOW, NIGHTSHIFT_MEMORY_OPTIMIZE_WORKFLOW_ID } from '.';

const workflow = parse(NIGHTSHIFT_MEMORY_OPTIMIZE_WORKFLOW.yaml) as {
  name: string;
  steps: Array<{ name: string; type?: string }>;
};

describe('semantic memory optimize workflow', () => {
  it('is a post-round workflow that labels recalled memories', () => {
    expect(NIGHTSHIFT_MEMORY_OPTIMIZE_WORKFLOW.id).toBe(NIGHTSHIFT_MEMORY_OPTIMIZE_WORKFLOW_ID);
    expect(workflow.name).toBe('Semantic Memory Optimize');
    expect(workflow.steps).toEqual([
      expect.objectContaining({
        name: 'optimize_memory',
        type: 'nightshift.memoryOptimize',
      }),
    ]);
  });
});
