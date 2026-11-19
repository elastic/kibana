/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { rewriteStepReferences } from './rewrite_step_references';

const workflow = (...steps: string[]) => `name: demo\nsteps:\n${steps.join('')}`;

describe('rewriteStepReferences', () => {
  it('follows a renamed step in templates and bare expressions', () => {
    const yaml = workflow(
      '  - name: c\n    type: console\n',
      '  - name: b\n    type: console\n    if: steps.a.output.ok\n    with:\n      message: "{{ steps.a.output.x }} and {{ steps.a.error }}"\n'
    );

    expect(rewriteStepReferences(yaml, 'a', 'c')).toBe(
      workflow(
        '  - name: c\n    type: console\n',
        '  - name: b\n    type: console\n    if: steps.c.output.ok\n    with:\n      message: "{{ steps.c.output.x }} and {{ steps.c.error }}"\n'
      )
    );
  });

  it('leaves other steps whose names only start the same', () => {
    const yaml = workflow(
      '  - name: b\n    type: console\n    with:\n      message: "{{ steps.ab.output }} {{ steps.a_b.output }} {{ steps.a-b.output }} {{ mysteps.a.output }}"\n'
    );

    expect(rewriteStepReferences(yaml, 'a', 'c')).toBe(yaml);
  });

  it('follows bracket references and writes a name that needs it as one', () => {
    const yaml = workflow(
      '  - name: b\n    type: console\n    with:\n      message: \'{{ steps["Fetch user"].output.id }} {{ steps.a.output }}\'\n'
    );

    expect(rewriteStepReferences(yaml, 'Fetch user', 'Load user')).toContain(
      '{{ steps["Load user"].output.id }}'
    );
    expect(rewriteStepReferences(yaml, 'a', 'New name')).toContain(
      '{{ steps["New name"].output }}'
    );
  });

  it('keeps comments and returns the very same text when nothing refers to the step', () => {
    const yaml = workflow(
      '  # note\n  - name: b\n    type: console\n    with:\n      message: hi\n'
    );

    expect(rewriteStepReferences(yaml, 'a', 'c')).toBe(yaml);
  });

  it('does not touch mapping keys', () => {
    const yaml = workflow('  - name: b\n    type: console\n    with:\n      steps.a: 1\n');

    expect(rewriteStepReferences(yaml, 'a', 'c')).toBe(yaml);
  });

  it('returns the input when the YAML cannot be read', () => {
    expect(rewriteStepReferences('steps: [', 'a', 'c')).toBe('steps: [');
  });
});
