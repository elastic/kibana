/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { LineCounter, parseDocument } from 'yaml';
import { validateYamlSyntax } from './validate_yaml_syntax';

function parseWithLineCounter(yaml: string) {
  const lineCounter = new LineCounter();
  const doc = parseDocument(yaml, { lineCounter });
  return { doc, lineCounter };
}

describe('validateYamlSyntax', () => {
  it('should return no errors for valid block-style YAML', () => {
    const { doc, lineCounter } = parseWithLineCounter(`name: Test Workflow
enabled: true
steps:
  - name: step1
    type: console
    with:
      message: "hello"`);

    const results = validateYamlSyntax(doc, lineCounter);
    expect(results).toHaveLength(0);
  });

  it('should detect flow mapping values and return markers with line positions', () => {
    const { doc, lineCounter } = parseWithLineCounter(`name: Test Workflow
steps:
  - name: step1
    with:
      comment: { key: value }`);

    const results = validateYamlSyntax(doc, lineCounter);
    expect(results.length).toBeGreaterThan(0);

    const flowError = results.find((r) => r.message.includes('Flow mapping'));
    expect(flowError).toBeDefined();
    expect(flowError!.owner).toBe('yaml-syntax-validation');
    expect(flowError!.severity).toBe('error');
    expect(flowError!.startLineNumber).toBeGreaterThan(0);
    expect(flowError!.startColumn).toBeGreaterThan(0);
  });

  it('should detect flow sequence values', () => {
    const { doc, lineCounter } = parseWithLineCounter(`name: Test Workflow
tags: [tag1, tag2]`);

    const results = validateYamlSyntax(doc, lineCounter);
    const flowError = results.find((r) => r.message?.includes('Flow sequence'));
    expect(flowError).toBeDefined();
    expect(flowError!.owner).toBe('yaml-syntax-validation');
  });

  it('should not flag quoted template expressions', () => {
    const { doc, lineCounter } = parseWithLineCounter(`name: Test Workflow
steps:
  - name: step1
    with:
      comment: "{{ inputs.comment }}"`);

    const results = validateYamlSyntax(doc, lineCounter);
    expect(results).toHaveLength(0);
  });

  it('should not flag block-style mappings or sequences', () => {
    const { doc, lineCounter } = parseWithLineCounter(`name: Test Workflow
tags:
  - tag1
  - tag2
steps:
  - name: step1
    with:
      nested:
        key: value`);

    const results = validateYamlSyntax(doc, lineCounter);
    expect(results).toHaveLength(0);
  });

  it('should include hover message for flow mapping errors', () => {
    const { doc, lineCounter } = parseWithLineCounter(`name: Test Workflow
steps:
  - name: step1
    with:
      body: { foo: bar }`);

    const results = validateYamlSyntax(doc, lineCounter);
    const flowError = results.find((r) => r.message?.includes('Flow mapping'));
    expect(flowError).toBeDefined();
    expect(flowError!.hoverMessage).toContain('Flow mapping syntax is not allowed');
  });
});
