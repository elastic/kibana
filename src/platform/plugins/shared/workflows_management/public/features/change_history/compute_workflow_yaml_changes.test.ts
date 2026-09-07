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

    expect(result.count).toBe(2);
    expect(result.summaryGroups).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: 'Triggers:',
          lines: expect.arrayContaining([
            expect.stringMatching(/removed/),
            expect.stringMatching(/added/),
          ]),
        }),
      ])
    );
  });

  it('does not count reordered triggers as modifications', () => {
    const twoTriggers = [
      'name: workflow',
      'triggers:',
      '  - type: manual',
      '  - type: scheduled',
    ].join('\n');

    const reorderedTriggers = [
      'name: workflow',
      'triggers:',
      '  - type: scheduled',
      '  - type: manual',
    ].join('\n');

    expect(computeWorkflowYamlChanges(twoTriggers, reorderedTriggers)).toEqual({ count: 0 });
  });

  it('counts same-type trigger config changes as updated', () => {
    const manualTrigger = (condition: string): string =>
      [
        'name: workflow',
        'triggers:',
        '  - type: manual',
        '    on:',
        `      condition: "${condition}"`,
      ].join('\n');

    const result = computeWorkflowYamlChanges(
      manualTrigger('severity: low'),
      manualTrigger('severity: high')
    );

    expect(result.count).toBe(1);
    expect(result.summaryGroups).toEqual([
      expect.objectContaining({
        title: 'Triggers:',
        lines: ['1 updated'],
      }),
    ]);
  });

  it('counts an added trigger when a new trigger type is introduced', () => {
    const withManual = ['name: workflow', 'triggers:', '  - type: manual'].join('\n');
    const withManualAndScheduled = [
      'name: workflow',
      'triggers:',
      '  - type: manual',
      '  - type: scheduled',
    ].join('\n');

    const result = computeWorkflowYamlChanges(withManual, withManualAndScheduled);

    expect(result.count).toBe(1);
    expect(result.summaryGroups).toEqual([
      expect.objectContaining({
        title: 'Triggers:',
        lines: ['1 added'],
      }),
    ]);
  });

  it('counts a removed trigger when a trigger type is dropped', () => {
    const withManualAndScheduled = [
      'name: workflow',
      'triggers:',
      '  - type: manual',
      '  - type: scheduled',
    ].join('\n');
    const withManual = ['name: workflow', 'triggers:', '  - type: manual'].join('\n');

    const result = computeWorkflowYamlChanges(withManualAndScheduled, withManual);

    expect(result.count).toBe(1);
    expect(result.summaryGroups).toEqual([
      expect.objectContaining({
        title: 'Triggers:',
        lines: ['1 removed'],
      }),
    ]);
  });

  it('counts updated, added, and removed triggers in the same diff', () => {
    const baseline = [
      'name: workflow',
      'triggers:',
      '  - type: manual',
      '    on:',
      '      condition: "severity: low"',
      '  - type: scheduled',
    ].join('\n');
    const target = [
      'name: workflow',
      'triggers:',
      '  - type: manual',
      '    on:',
      '      condition: "severity: high"',
      '  - type: alert',
    ].join('\n');

    const result = computeWorkflowYamlChanges(baseline, target);

    expect(result.count).toBe(3);
    expect(result.summaryGroups).toEqual([
      expect.objectContaining({
        title: 'Triggers:',
        lines: ['1 added', '1 removed', '1 updated'],
      }),
    ]);
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

  it('counts nested step edits once without also flagging the container step', () => {
    const nestedStepWorkflow = (innerMessage: string): string =>
      [
        'name: workflow',
        'triggers:',
        '  - type: manual',
        'steps:',
        '  - name: loop',
        '    type: foreach',
        "    foreach: '[1,2]'",
        '    steps:',
        '      - name: inner',
        '        type: console',
        '        with:',
        `          message: ${innerMessage}`,
      ].join('\n');

    const result = computeWorkflowYamlChanges(
      nestedStepWorkflow('hello'),
      nestedStepWorkflow('world')
    );

    expect(result.count).toBe(1);
    expect(result.summaryGroups).toEqual([
      expect.objectContaining({
        title: 'Steps:',
        lines: ['1 updated'],
      }),
    ]);
  });

  it('still flags container step config changes separately from nested step edits', () => {
    const foreachWorkflow = (foreachValue: string, innerMessage: string): string =>
      [
        'name: workflow',
        'triggers:',
        '  - type: manual',
        'steps:',
        '  - name: loop',
        '    type: foreach',
        `    foreach: '${foreachValue}'`,
        '    steps:',
        '      - name: inner',
        '        type: console',
        '        with:',
        `          message: ${innerMessage}`,
      ].join('\n');

    const result = computeWorkflowYamlChanges(
      foreachWorkflow('[1,2]', 'hello'),
      foreachWorkflow('[1,2,3]', 'world')
    );

    expect(result.count).toBe(2);
    expect(result.summaryGroups).toEqual([
      expect.objectContaining({
        title: 'Steps:',
        lines: ['2 updated'],
      }),
    ]);
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

  it('counts nested else-branch step edits without flagging the if step', () => {
    const ifElseWorkflow = (elseMessage: string): string =>
      [
        'name: workflow',
        'triggers:',
        '  - type: manual',
        'steps:',
        '  - name: check',
        '    type: if',
        '    condition: "true"',
        '    steps:',
        '      - name: then_step',
        '        type: console',
        '        with:',
        '          message: then',
        '    else:',
        '      - name: else_step',
        '        type: console',
        '        with:',
        `          message: ${elseMessage}`,
      ].join('\n');

    const result = computeWorkflowYamlChanges(ifElseWorkflow('hello'), ifElseWorkflow('world'));

    expect(result.count).toBe(1);
    expect(result.summaryGroups).toEqual([
      expect.objectContaining({
        title: 'Steps:',
        lines: ['1 updated'],
      }),
    ]);
  });

  it('counts nested switch case step edits without flagging the switch step', () => {
    const switchWorkflow = (caseMessage: string): string =>
      [
        'name: workflow',
        'triggers:',
        '  - type: manual',
        'steps:',
        '  - name: route',
        '    type: switch',
        '    expression: "{{ steps.prev.output.status }}"',
        '    cases:',
        '      - match: ok',
        '        steps:',
        '          - name: ok_step',
        '            type: console',
        '            with:',
        `              message: ${caseMessage}`,
      ].join('\n');

    const result = computeWorkflowYamlChanges(switchWorkflow('hello'), switchWorkflow('world'));

    expect(result.count).toBe(1);
    expect(result.summaryGroups).toEqual([
      expect.objectContaining({
        title: 'Steps:',
        lines: ['1 updated'],
      }),
    ]);
  });

  it('counts nested switch default step edits without flagging the switch step', () => {
    const switchDefaultWorkflow = (defaultMessage: string): string =>
      [
        'name: workflow',
        'triggers:',
        '  - type: manual',
        'steps:',
        '  - name: route',
        '    type: switch',
        '    expression: "{{ steps.prev.output.status }}"',
        '    cases:',
        '      - match: ok',
        '        steps:',
        '          - name: ok_step',
        '            type: console',
        '            with:',
        '              message: ok',
        '    default:',
        '      - name: default_step',
        '        type: console',
        '        with:',
        `          message: ${defaultMessage}`,
      ].join('\n');

    const result = computeWorkflowYamlChanges(
      switchDefaultWorkflow('hello'),
      switchDefaultWorkflow('world')
    );

    expect(result.count).toBe(1);
    expect(result.summaryGroups).toEqual([
      expect.objectContaining({
        title: 'Steps:',
        lines: ['1 updated'],
      }),
    ]);
  });

  it('still flags if and switch container config changes separately from nested step edits', () => {
    const ifWorkflow = (condition: string, elseMessage: string): string =>
      [
        'name: workflow',
        'triggers:',
        '  - type: manual',
        'steps:',
        '  - name: check',
        '    type: if',
        `    condition: "${condition}"`,
        '    steps:',
        '      - name: then_step',
        '        type: console',
        '        with:',
        '          message: then',
        '    else:',
        '      - name: else_step',
        '        type: console',
        '        with:',
        `          message: ${elseMessage}`,
      ].join('\n');

    const result = computeWorkflowYamlChanges(
      ifWorkflow('true', 'hello'),
      ifWorkflow('false', 'world')
    );

    expect(result.count).toBe(2);
    expect(result.summaryGroups).toEqual([
      expect.objectContaining({
        title: 'Steps:',
        lines: ['2 updated'],
      }),
    ]);
  });

  it('counts nested on-failure fallback step edits without flagging the parent step', () => {
    const fallbackWorkflow = (fallbackMessage: string): string =>
      [
        'name: workflow',
        'triggers:',
        '  - type: manual',
        'steps:',
        '  - name: risky',
        '    type: console',
        '    with:',
        '      message: hello',
        '    on-failure:',
        '      fallback:',
        '        - name: fallback_step',
        '          type: console',
        '          with:',
        `            message: ${fallbackMessage}`,
      ].join('\n');

    const result = computeWorkflowYamlChanges(fallbackWorkflow('hello'), fallbackWorkflow('world'));

    expect(result.count).toBe(1);
    expect(result.summaryGroups).toEqual([
      expect.objectContaining({
        title: 'Steps:',
        lines: ['1 updated'],
      }),
    ]);
  });

  it('counts nested iteration-on-failure fallback step edits without flagging the parent step', () => {
    const fallbackWorkflow = (fallbackMessage: string): string =>
      [
        'name: workflow',
        'triggers:',
        '  - type: manual',
        'steps:',
        '  - name: loop',
        '    type: foreach',
        "    foreach: '[1,2]'",
        '    iteration-on-failure:',
        '      fallback:',
        '        - name: fallback_step',
        '          type: console',
        '          with:',
        `            message: ${fallbackMessage}`,
      ].join('\n');

    const result = computeWorkflowYamlChanges(fallbackWorkflow('hello'), fallbackWorkflow('world'));

    expect(result.count).toBe(1);
    expect(result.summaryGroups).toEqual([
      expect.objectContaining({
        title: 'Steps:',
        lines: ['1 updated'],
      }),
    ]);
  });
});
