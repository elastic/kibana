/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { detectFileFormat, isDynamicWorkflowReference, isValidWorkflowId } from '.';

describe('isValidWorkflowId', () => {
  it('should accept a simple alphanumeric ID', () => {
    expect(isValidWorkflowId('workflow-1')).toBe(true);
  });

  it('should accept IDs with dots, hyphens, and underscores', () => {
    expect(isValidWorkflowId('my.workflow_v2-beta')).toBe(true);
  });

  it('should accept an ID of exactly 255 characters', () => {
    const id = `a${'b'.repeat(254)}`;
    expect(id).toHaveLength(255);
    expect(isValidWorkflowId(id)).toBe(true);
  });

  it('should reject an empty string', () => {
    expect(isValidWorkflowId('')).toBe(false);
  });

  it('should reject an ID starting with a dot', () => {
    expect(isValidWorkflowId('.hidden')).toBe(false);
  });

  it('should reject an ID starting with a hyphen', () => {
    expect(isValidWorkflowId('-dashed')).toBe(false);
  });

  it('should reject an ID starting with an underscore', () => {
    expect(isValidWorkflowId('_private')).toBe(false);
  });

  it('should reject an ID exceeding 255 characters', () => {
    const id = 'a'.repeat(256);
    expect(isValidWorkflowId(id)).toBe(false);
  });

  it('should reject __proto__ (prototype pollution)', () => {
    expect(isValidWorkflowId('__proto__')).toBe(false);
  });

  it('should reject constructor (prototype pollution)', () => {
    expect(isValidWorkflowId('constructor')).toBe(false);
  });

  it('should reject prototype (prototype pollution)', () => {
    expect(isValidWorkflowId('prototype')).toBe(false);
  });

  it('should reject IDs with spaces', () => {
    expect(isValidWorkflowId('my workflow')).toBe(false);
  });

  it('should reject IDs with special characters', () => {
    expect(isValidWorkflowId('workflow@1')).toBe(false);
    expect(isValidWorkflowId('workflow#1')).toBe(false);
    expect(isValidWorkflowId('workflow!1')).toBe(false);
  });
});

describe('isDynamicWorkflowReference', () => {
  it('should return true for templates containing {{', () => {
    expect(isDynamicWorkflowReference('{{ inputs.id }}')).toBe(true);
  });

  it('should return false for static strings', () => {
    expect(isDynamicWorkflowReference('my-workflow-id')).toBe(false);
  });

  it('should return true for nested templates', () => {
    expect(isDynamicWorkflowReference('{{ steps.{{ name }}.result }}')).toBe(true);
  });

  it('should return true when {{ appears mid-string', () => {
    expect(isDynamicWorkflowReference('prefix-{{ inputs.suffix }}')).toBe(true);
  });
});

describe('detectFileFormat', () => {
  it('should return zip for bytes starting with PK magic (0x50 0x4b)', () => {
    expect(detectFileFormat(new Uint8Array([0x50, 0x4b, 0x03, 0x04]))).toBe('zip');
  });

  it('should return yaml for non-PK bytes', () => {
    const yamlBytes = new TextEncoder().encode('name: test');
    expect(detectFileFormat(yamlBytes)).toBe('yaml');
  });

  it('should return yaml for a single-byte input', () => {
    expect(detectFileFormat(new Uint8Array([0x50]))).toBe('yaml');
  });

  it('should return yaml for an empty input', () => {
    expect(detectFileFormat(new Uint8Array([]))).toBe('yaml');
  });

  it('should return zip for minimal PK header (exactly 2 bytes)', () => {
    expect(detectFileFormat(new Uint8Array([0x50, 0x4b]))).toBe('zip');
  });
});
