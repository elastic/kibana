/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parseDocument } from 'yaml';
import { getYamlDocumentErrors, getYamlDocumentErrorsDetailed } from './validate_yaml_document';

describe('getYamlDocumentErrors', () => {
  it('should return no errors for valid YAML with block-style mappings', () => {
    const yaml = `name: Test Workflow
enabled: true
steps:
  - name: step1
    type: console
    with:
      message: hello`;
    const doc = parseDocument(yaml);
    const errors = getYamlDocumentErrors(doc);
    expect(errors).toHaveLength(0);
  });

  it('should detect unquoted double-brace template expressions', () => {
    const yaml = `name: Test Workflow
steps:
  - name: step1
    type: jira
    with:
      comment: {{ inputs.comment }}`;
    const doc = parseDocument(yaml);
    const errors = getYamlDocumentErrors(doc);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].message).toContain('Unquoted template expression');
  });

  it('should return no errors for quoted template expressions', () => {
    const yaml = `name: Test Workflow
steps:
  - name: step1
    type: jira
    with:
      comment: "{{ inputs.comment }}"`;
    const doc = parseDocument(yaml);
    const errors = getYamlDocumentErrors(doc);
    expect(errors).toHaveLength(0);
  });
});

describe('getYamlDocumentErrorsDetailed', () => {
  it('should return no errors for valid YAML', () => {
    const yaml = `name: Test Workflow
enabled: true
steps:
  - name: step1
    type: console`;
    const doc = parseDocument(yaml);
    const errors = getYamlDocumentErrorsDetailed(doc);
    expect(errors).toHaveLength(0);
  });

  it('should allow single-level flow mappings', () => {
    const yaml = `name: Test Workflow
steps:
  - name: step1
    type: jira
    with:
      comment: { key: value }`;
    const doc = parseDocument(yaml);
    const errors = getYamlDocumentErrorsDetailed(doc);
    expect(errors).toHaveLength(0);
  });

  it('should allow flow sequence values', () => {
    const yaml = `name: Test Workflow
tags: [tag1, tag2]`;
    const doc = parseDocument(yaml);
    const errors = getYamlDocumentErrorsDetailed(doc);
    expect(errors).toHaveLength(0);
  });

  it('should allow nested flow sequences', () => {
    const yaml = `name: Test Workflow
steps:
  - name: step1
    with:
      items: [a, b, c]
      labels: ["label1", "label2"]`;
    const doc = parseDocument(yaml);
    const errors = getYamlDocumentErrorsDetailed(doc);
    expect(errors).toHaveLength(0);
  });

  it('should flag double-brace but allow flow sequence and single-level flow mapping', () => {
    const yaml = `name: Test Workflow
tags: [tag1, tag2]
steps:
  - name: step1
    with:
      body: { key: value }
      comment: {{ inputs.comment }}`;
    const doc = parseDocument(yaml);
    const errors = getYamlDocumentErrorsDetailed(doc);
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toContain('Unquoted template expression');
  });

  it('should allow empty flow mappings', () => {
    const yaml = `name: Test Workflow
steps:
  - name: step1
    action: test
    config: {}`;
    const doc = parseDocument(yaml);
    const errors = getYamlDocumentErrorsDetailed(doc);
    expect(errors).toHaveLength(0);
  });

  it('should not flag block-style mappings', () => {
    const yaml = `name: Test Workflow
steps:
  - name: step1
    with:
      nested:
        key: value`;
    const doc = parseDocument(yaml);
    const errors = getYamlDocumentErrorsDetailed(doc);
    expect(errors).toHaveLength(0);
  });

  it('should not flag block-style sequences', () => {
    const yaml = `name: Test Workflow
tags:
  - tag1
  - tag2`;
    const doc = parseDocument(yaml);
    const errors = getYamlDocumentErrorsDetailed(doc);
    expect(errors).toHaveLength(0);
  });

  it('should not flag quoted template expressions', () => {
    const yaml = `name: Test Workflow
steps:
  - name: step1
    with:
      comment: "{{ inputs.comment }}"
      summary: "{{ inputs.summary }}"`;
    const doc = parseDocument(yaml);
    const errors = getYamlDocumentErrorsDetailed(doc);
    expect(errors).toHaveLength(0);
  });

  it('should detect unquoted double-brace template expressions with range', () => {
    const yaml = `name: Test Workflow
steps:
  - name: step1
    with:
      comment: {{ inputs.comment }}`;
    const doc = parseDocument(yaml);
    const errors = getYamlDocumentErrorsDetailed(doc);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].message).toContain('Unquoted template expression');
    expect(errors[0].range).toBeDefined();
  });

  it('should include parser errors from the document', () => {
    const yaml = `name: "unclosed string`;
    const doc = parseDocument(yaml);
    const errors = getYamlDocumentErrorsDetailed(doc);
    expect(errors.length).toBeGreaterThan(0);
  });
});
