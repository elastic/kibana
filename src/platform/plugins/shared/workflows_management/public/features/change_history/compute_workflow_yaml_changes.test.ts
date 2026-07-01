/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { computeWorkflowYamlChanges } from './compute_workflow_yaml_changes';

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
  it('returns 0 for identical yaml', () => {
    const yaml = minimalWorkflowYaml('same');

    expect(computeWorkflowYamlChanges(yaml, yaml)).toEqual({ count: 0 });
  });

  it('returns semantic summary when workflow yaml parses', () => {
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

  it('returns semantic summary for settings-only workflows', () => {
    const result = computeWorkflowYamlChanges('name: original\n', 'name: updated\n');

    expect(result.count).toBe(1);
    expect(result.summaryGroups).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: 'Settings:',
          lines: expect.arrayContaining([expect.stringMatching(/updated/)]),
        }),
      ])
    );
  });

  it('falls back to line hunks without summary when yaml does not parse', () => {
    const result = computeWorkflowYamlChanges('invalid yaml', 'name: updated\n');

    expect(result.count).toBeGreaterThan(0);
    expect(result.summaryGroups).toBeUndefined();
  });

  it('ignores steps without a valid name in semantic diff', () => {
    const withUnnamedStep = [
      'name: workflow',
      'triggers:',
      '  - type: manual',
      'steps:',
      '  - type: console',
      '    with:',
      '      message: hello',
      '  - name: valid_step',
      '    type: console',
      '    with:',
      '      message: world',
    ].join('\n');

    const withNamedStepOnly = [
      'name: workflow',
      'triggers:',
      '  - type: manual',
      'steps:',
      '  - name: valid_step',
      '    type: console',
      '    with:',
      '      message: world',
    ].join('\n');

    expect(computeWorkflowYamlChanges(withUnnamedStep, withNamedStepOnly)).toEqual({ count: 0 });
  });

  it('returns semantic summary for workflows with steps only', () => {
    const stepsOnly = (stepName: string): string =>
      [
        'name: workflow',
        'steps:',
        `  - name: ${stepName}`,
        '    type: console',
        '    with:',
        '      message: hello',
      ].join('\n');

    const result = computeWorkflowYamlChanges(stepsOnly('notify'), stepsOnly('alert'));

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

  it('returns semantic summary for workflows with triggers only', () => {
    const triggersOnly = (triggerType: string): string =>
      ['name: workflow', 'triggers:', `  - type: ${triggerType}`].join('\n');

    const result = computeWorkflowYamlChanges(triggersOnly('manual'), triggersOnly('scheduled'));

    expect(result.count).toBeGreaterThan(0);
    expect(result.summaryGroups).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: 'Triggers:',
          lines: expect.arrayContaining([expect.stringMatching(/updated/)]),
        }),
      ])
    );
  });

  it('counts changes for sibling steps that share the same name', () => {
    const duplicateNamedSteps = (firstMessage: string, secondMessage: string): string =>
      [
        'name: workflow',
        'triggers:',
        '  - type: manual',
        'steps:',
        '  - name: foo',
        '    type: console',
        '    with:',
        `      message: ${firstMessage}`,
        '  - name: foo',
        '    type: console',
        '    with:',
        `      message: ${secondMessage}`,
      ].join('\n');

    const result = computeWorkflowYamlChanges(
      duplicateNamedSteps('hello', 'world'),
      duplicateNamedSteps('hello', 'changed')
    );

    expect(result.count).toBe(1);
    expect(result.summaryGroups).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: 'Steps:',
          lines: expect.arrayContaining([expect.stringMatching(/updated/)]),
        }),
      ])
    );
  });

  it('does not treat reordered step keys as modifications', () => {
    const nameFirstStep = [
      'name: workflow',
      'triggers:',
      '  - type: manual',
      'steps:',
      '  - name: notify',
      '    type: console',
      '    with:',
      '      message: hello',
    ].join('\n');

    const typeFirstStep = [
      'name: workflow',
      'triggers:',
      '  - type: manual',
      'steps:',
      '  - type: console',
      '    name: notify',
      '    with:',
      '      message: hello',
    ].join('\n');

    expect(computeWorkflowYamlChanges(nameFirstStep, typeFirstStep)).toEqual({ count: 0 });
  });
});
