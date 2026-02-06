/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parseDocument, YAMLMap } from 'yaml';
import { getStepNodeAtPosition } from './get_step_node_at_position';

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
