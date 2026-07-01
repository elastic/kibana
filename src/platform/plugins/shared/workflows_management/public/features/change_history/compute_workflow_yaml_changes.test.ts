/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const minimalWorkflowYaml = (name: string, stepName = 'step'): string =>
  [
    `name: ${name}`,
    'triggers:',
    '  - type: manual',
    'steps:',
    `  - name: ${stepName}`,
    '    type: console',
    '    with:',
    '      message: hello',
  ].join('\n');

describe('computeWorkflowYamlChanges', () => {
  it('returns 0 for identical yaml', async () => {
    const { computeWorkflowYamlChanges } = await import('./compute_workflow_yaml_changes');
    const yaml = minimalWorkflowYaml('same');

    expect(computeWorkflowYamlChanges(yaml, yaml)).toEqual({ count: 0 });
  });

  it('returns semantic summary when workflow yaml parses', async () => {
    const { computeWorkflowYamlChanges } = await import('./compute_workflow_yaml_changes');

    const result = computeWorkflowYamlChanges(
      minimalWorkflowYaml('original', 'notify'),
      minimalWorkflowYaml('updated', 'alert')
    );

    expect(result.count).toBeGreaterThan(0);
    expect(result.summaryGroups).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: 'Steps:',
          lines: expect.arrayContaining([expect.stringMatching(/added/)]),
        }),
      ])
    );
  });

  it('falls back to line hunks without summary when workflow shape is incomplete', async () => {
    const { computeWorkflowYamlChanges } = await import('./compute_workflow_yaml_changes');

    const result = computeWorkflowYamlChanges('name: original\n', 'name: updated\n');

    expect(result).toEqual({ count: 1 });
    expect(result.summaryGroups).toBeUndefined();
  });
});
