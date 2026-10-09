/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { WorkflowYaml } from '@kbn/workflows';
import { stringifyWorkflowDefinition } from './stringify_workflow_definition';

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
