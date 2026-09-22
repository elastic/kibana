/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { LineCounter, parseDocument } from 'yaml';
import { buildStepSelectionValues, inspectStep } from './build_workflow_lookup';

describe('buildStepSelectionValues', () => {
  function getStep(yaml: string): ReturnType<typeof inspectStep>[string] {
    const lineCounter = new LineCounter();
    const yamlDocument = parseDocument(yaml, { lineCounter, keepSourceTokens: true });
    const stepsNode = (yamlDocument.contents as any).get('steps');
    const steps = inspectStep(stepsNode, lineCounter);
    return Object.values(steps)[0];
  }

  it('should return empty when valuePaths is undefined', () => {
    const step = getStep(`
steps:
  - name: s1
    type: my.step
`);
    const values = buildStepSelectionValues(step);
    expect(values).toEqual({ config: {}, input: {} });
  });

  it('should include only properties matching valuePaths', () => {
    const step = getStep(`
steps:
  - name: s1
    type: my.step
    proxy:
      id: p1
      ssl: true
    other: ignored
`);
    const values = buildStepSelectionValues(step, ['config.proxy.ssl', 'config.other']);
    expect(values).toEqual({
      config: { other: 'ignored', proxy: { ssl: true } },
      input: {},
    });
  });

  it('should include an input path when requested', () => {
    const step = getStep(`
steps:
  - name: s1
    type: my.step
    with:
      owner: a
      message: hi
`);
    const values = buildStepSelectionValues(step, ['input.owner']);
    expect(values).toEqual({
      config: {},
      input: { owner: 'a' },
    });
  });

  it('should return empty when valuePaths match nothing', () => {
    const step = getStep(`
steps:
  - name: s1
    type: my.step
    foo: 1
`);
    const values = buildStepSelectionValues(step, ['config.bar']);
    expect(values).toEqual({ config: {}, input: {} });
  });

  it('should not assign onto Object.prototype when path segments include "__proto__"', () => {
    const probe = '__wmBuildWorkflowLookupProtoProbe';
    delete (Object.prototype as Record<string, unknown>)[probe];
    const step = getStep(`
steps:
  - name: s1
    type: my.step
    __proto__:
      ${probe}: polluted
`);
    buildStepSelectionValues(step, [`config.__proto__.${probe}`]);
    expect(Object.hasOwn(Object.prototype, probe)).toBe(false);
    expect((Object.prototype as Record<string, unknown>)[probe]).toBeUndefined();
  });

  it('should not assign onto Object.prototype when path segments include "constructor"', () => {
    const probe = '__wmBuildWorkflowLookupProtoProbe';
    delete (Object.prototype as Record<string, unknown>)[probe];
    const step = getStep(`
steps:
  - name: s1
    type: my.step
    constructor:
      ${probe}: polluted
`);
    const values = buildStepSelectionValues(step, [`config.constructor.${probe}`]);
    expect((Object.prototype as Record<string, unknown>)[probe]).toBeUndefined();
    expect(({} as Record<string, unknown>)[probe]).toBeUndefined();
    expect(values.config.constructor).toBeDefined();
    expect((values.config.constructor as any)[probe]).toBe('polluted');
  });

  it('should not assign onto Object.prototype when path segments include "prototype"', () => {
    const probe = '__wmBuildWorkflowLookupProtoProbe';
    delete (Object.prototype as Record<string, unknown>)[probe];
    const step = getStep(`
steps:
  - name: s1
    type: my.step
    prototype:
      ${probe}: polluted
`);
    const values = buildStepSelectionValues(step, [`config.prototype.${probe}`]);
    expect((Object.prototype as Record<string, unknown>)[probe]).toBeUndefined();
    expect(({} as Record<string, unknown>)[probe]).toBeUndefined();
    expect(values.config.prototype).toBeDefined();
    expect((values.config.prototype as Record<string, unknown>)[probe]).toBe('polluted');
  });
});
