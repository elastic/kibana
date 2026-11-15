/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { workflowRunEmbeddableSchema } from './schema';
import { WORKFLOW_RUN_PANEL_MAX_MAPPINGS } from '../../common/dashboard_run_panel/constants';

describe('workflowRunEmbeddableSchema', () => {
  it('accepts a panel with every kind of input mapping', () => {
    const state = {
      title: 'Contain host',
      workflow_id: 'workflow-1',
      button_label: 'Isolate',
      input_mappings: [
        { input: 'host', source: 'control', control_id: 'control-1' },
        { input: 'window', source: 'time_range' },
        { input: 'since', source: 'time_range', part: 'from' },
        { input: 'scope', source: 'query' },
        { input: 'reason', source: 'constant', value: 'Triage from dashboard' },
        { input: 'tags', source: 'constant', value: ['a', 'b'] },
      ],
    };
    expect(workflowRunEmbeddableSchema.parse(state)).toEqual(state);
  });

  it('accepts the graph layouts and rejects others', () => {
    for (const graphLayout of ['auto', 'horizontal', 'vertical']) {
      expect(
        workflowRunEmbeddableSchema.safeParse({ workflow_id: 'w', graph_layout: graphLayout })
          .success
      ).toBe(true);
    }
    expect(
      workflowRunEmbeddableSchema.safeParse({ workflow_id: 'w', graph_layout: 'diagonal' }).success
    ).toBe(false);
  });

  it('requires a workflow', () => {
    expect(workflowRunEmbeddableSchema.safeParse({ title: 'x' }).success).toBe(false);
    expect(workflowRunEmbeddableSchema.safeParse({ workflow_id: '' }).success).toBe(false);
  });

  it('rejects unknown sources and unknown keys', () => {
    expect(
      workflowRunEmbeddableSchema.safeParse({
        workflow_id: 'w',
        input_mappings: [{ input: 'a', source: 'alert' }],
      }).success
    ).toBe(false);
    expect(
      workflowRunEmbeddableSchema.safeParse({ workflow_id: 'w', api_key: 'secret' }).success
    ).toBe(false);
  });

  it('bounds the number of mappings and the size of values', () => {
    const tooMany = Array.from({ length: WORKFLOW_RUN_PANEL_MAX_MAPPINGS + 1 }, (_, index) => ({
      input: `input_${index}`,
      source: 'query',
    }));
    expect(
      workflowRunEmbeddableSchema.safeParse({ workflow_id: 'w', input_mappings: tooMany }).success
    ).toBe(false);
    expect(
      workflowRunEmbeddableSchema.safeParse({
        workflow_id: 'w',
        input_mappings: [{ input: 'a', source: 'constant', value: 'x'.repeat(10_001) }],
      }).success
    ).toBe(false);
  });
});
