/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parseDocument, YAMLMap } from 'yaml';
import type { WorkflowYaml } from '@kbn/workflows';
import { getStepNodeAtPosition, stringifyWorkflowDefinition } from './yaml_utils';

describe('getYamlStringFromJSON', () => {
  it('should sort keys according to the order of the keys in the workflow definition', () => {
    const json: Partial<WorkflowYaml> = {
      enabled: true,
      steps: [
        {
          name: 'step1',
          type: 'noop',
          with: { message: 'Hello, world!' },
        },
      ],
      description: 'test',
      name: 'test',
    };
    const yaml = stringifyWorkflowDefinition(json);
    expect(yaml).toBe(`name: test
description: test
enabled: true
steps:
  - name: step1
    type: noop
    with:
      message: Hello, world!
`);
  });

  it('it should throw an error if the input is not a plain object', () => {
    const json: any = [1, 2, 3];
    expect(() => stringifyWorkflowDefinition(json)).toThrow();
  });
});

describe('getStepNodeAtPosition', () => {
  it('should get the step node at the position', () => {
    const yaml = `steps:
      - name: noop_step
        type: noop # cursor is here
        with:
          message: Hello, world!`;
    const result = getStepNodeAtPosition(parseDocument(yaml), 45);
    expect(result).toEqual(expect.any(YAMLMap));
    expect(result?.get('name')).toBe('noop_step');
  });
  it('should get the step node at the position with nested steps', () => {
    const yaml = `steps:
      - name: loop 
        type: foreach
        foreach: "{{ context.items }}"
        steps:
          - name: noop_step
            type: noop # cursor is here
            with:
              message: Hello, world!
      - name: log
        type: console
        with:
          message: "{{ steps.noop_step.output.message }}"
              `;
    const result = getStepNodeAtPosition(parseDocument(yaml), 153);
    expect(result).toEqual(expect.any(YAMLMap));
    expect(result?.get('name')).toBe('noop_step');

    const result2 = getStepNodeAtPosition(parseDocument(yaml), 265);
    expect(result2).toEqual(expect.any(YAMLMap));
    expect(result2?.get('name')).toBe('log');

    const result3 = getStepNodeAtPosition(parseDocument(yaml), 48);
    expect(result3).toEqual(expect.any(YAMLMap));
    expect(result3?.get('name')).toBe('loop');
  });
});
