/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parseDocument } from 'yaml';
import { resolveExternalStepFragment } from './resolve_external_step_fragment';

const yamlWith = (stepBody: string, other = 'x') => `version: "1"
name: demo
steps:
  - name: other
    type: console
    with:
      message: ${other}
  - name: me
${stepBody
  .split('\n')
  .map((line) => `    ${line}`)
  .join('\n')}
`;

const ME = 'type: console\nwith:\n  message: hi\n  count: 5';
const APPLIED = 'name: me\ntype: console\nwith:\n  message: hi\n  count: 5\n';

const resolve = (
  editorYaml: string,
  overrides: Partial<Parameters<typeof resolveExternalStepFragment>[0]> = {}
) =>
  resolveExternalStepFragment({
    editorYaml,
    stepName: 'me',
    lastAppliedYaml: null,
    lastAppliedFragment: APPLIED,
    ...overrides,
  });

const toJs = (fragment: string | undefined) => parseDocument(fragment ?? '').toJS();

describe('resolveExternalStepFragment', () => {
  it('has nothing to report when the YAML is the one this session last wrote', () => {
    const yaml = yamlWith(ME);
    expect(resolve(yaml, { lastAppliedYaml: yaml })).toBeUndefined();
  });

  it('has nothing to report when the step is the same and only another step changed', () => {
    expect(resolve(yamlWith(ME, 'changed elsewhere'))).toBeUndefined();
  });

  it('reports the step as it now is when its content was changed from outside', () => {
    const changed = yamlWith('type: console\nwith:\n  message: hi\n  count: 9');
    expect(toJs(resolve(changed))).toEqual({
      name: 'me',
      type: 'console',
      with: { message: 'hi', count: 9 },
    });
  });

  it('reports a key that was removed from outside', () => {
    const changed = yamlWith('type: console\nwith:\n  message: hi');
    expect(toJs(resolve(changed))).toEqual({
      name: 'me',
      type: 'console',
      with: { message: 'hi' },
    });
  });

  it('ignores a change of comments or key order, which is not a change of the step', () => {
    const reordered = yamlWith('with:\n  count: 5 # five\n  message: hi\ntype: console');
    expect(resolve(reordered)).toBeUndefined();
  });

  it('has nothing to report when the step is gone, so the panel keeps its draft', () => {
    const gone = `version: "1"\nname: demo\nsteps:\n  - name: other\n    type: console\n`;
    expect(resolve(gone)).toBeUndefined();
  });

  it('has nothing to report when nothing was applied yet to compare with', () => {
    expect(resolve(yamlWith(ME), { lastAppliedFragment: null })).toBeUndefined();
  });

  it('finds a step nested in a container', () => {
    const nested = `version: "1"
name: demo
steps:
  - name: loop
    type: foreach
    foreach: "[1]"
    steps:
      - name: me
        type: console
        with:
          message: changed
`;
    expect(toJs(resolve(nested))).toEqual({
      name: 'me',
      type: 'console',
      with: { message: 'changed' },
    });
  });
});
