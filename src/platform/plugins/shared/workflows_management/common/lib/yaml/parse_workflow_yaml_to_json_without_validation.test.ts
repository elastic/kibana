/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parseYamlToJSONWithoutValidation } from './parse_workflow_yaml_to_json_without_validation';

describe('parseYamlToJSONWithoutValidation', () => {
  it('should return the correct JSON object', () => {
    const yaml = `steps:
      - name: noop_step
        type: noop
        with:
          message: Hello, world!`;
    const result = parseYamlToJSONWithoutValidation(yaml);
    expect((result as any).json).toEqual({
      steps: [
        {
          name: 'noop_step',
          type: 'noop',
          with: {
            message: 'Hello, world!',
          },
        },
      ],
    });
  });
  it('should return the correct JSON object even with incomplete yaml', () => {
    const yaml = `steps:
  - name: first-step 
    type  
  - name: if
    type: if
    condition: 'true'
    steps:
      - name: then-step
        type: console
        with:
          message: "true {{event.spaceId}}"`;
    const result = parseYamlToJSONWithoutValidation(yaml);
    expect((result as any).json).toEqual({
      steps: [
        { name: 'first-step', type: null },
        {
          name: 'if',
          type: 'if',
          condition: 'true',
          steps: [
            { name: 'then-step', type: 'console', with: { message: 'true {{event.spaceId}}' } },
          ],
        },
      ],
    });
  });
});
