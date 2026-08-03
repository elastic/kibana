/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { summarizeWorkflowDefinitionDiff } from './summarize_workflow_definition_diff';

describe('summarizeWorkflowDefinitionDiff', () => {
  it('groups changes by entity with added, removed, and updated counts', () => {
    expect(
      summarizeWorkflowDefinitionDiff([
        { kind: 'step_added', label: 'alert' },
        { kind: 'step_added', label: 'enrich' },
        { kind: 'step_removed', label: 'notify' },
        { kind: 'step_modified', label: 'hello_world_step' },
        { kind: 'trigger_modified', label: 'manual' },
        { kind: 'setting_changed', label: 'name' },
        { kind: 'setting_changed', label: 'description' },
        { kind: 'setting_changed', label: 'enabled' },
        { kind: 'setting_changed', label: 'tags' },
      ])
    ).toEqual([
      {
        title: 'Steps:',
        lines: ['2 added', '1 removed', '1 updated'],
      },
      {
        title: 'Triggers:',
        lines: ['1 updated'],
      },
      {
        title: 'Settings:',
        lines: ['4 updated'],
      },
    ]);
  });
});
