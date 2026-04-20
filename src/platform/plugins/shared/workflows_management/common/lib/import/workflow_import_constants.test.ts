/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  buildSuffixedCandidate,
  detectFileFormat,
  isDynamicWorkflowReference,
  isUnsafeWorkflowId,
  isValidWorkflowId,
  resolveCollisionId,
} from '.';

describe('isValidWorkflowId', () => {
  it('should accept a simple alphanumeric ID', () => {
    expect(isValidWorkflowId('workflow-1')).toBe(true);
  });

  it('should accept IDs with hyphens', () => {
    expect(isValidWorkflowId('my-workflow-v2-beta')).toBe(true);
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

describe('isUnsafeWorkflowId', () => {
  it('should reject __proto__', () => {
    expect(isUnsafeWorkflowId('__proto__')).toBe(true);
  });

  it('should reject constructor', () => {
    expect(isUnsafeWorkflowId('constructor')).toBe(true);
  });

  it('should reject prototype', () => {
    expect(isUnsafeWorkflowId('prototype')).toBe(true);
  });

  it('should reject empty string', () => {
    expect(isUnsafeWorkflowId('')).toBe(true);
  });

  it('should reject IDs exceeding max length', () => {
    expect(isUnsafeWorkflowId('a'.repeat(256))).toBe(true);
  });

  it('should reject IDs containing path traversal (..)', () => {
    expect(isUnsafeWorkflowId('..%2fetc%2fpasswd')).toBe(true);
    expect(isUnsafeWorkflowId('../etc/passwd')).toBe(true);
  });

  it('should reject IDs containing forward slashes', () => {
    expect(isUnsafeWorkflowId('path/to/file')).toBe(true);
  });

  it('should accept a normal legacy ID with uppercase and underscores', () => {
    expect(isUnsafeWorkflowId('My_Workflow')).toBe(false);
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

describe('resolveCollisionId', () => {
  it('should return baseId when it does not conflict', () => {
    expect(resolveCollisionId('my-workflow', new Set(), 'fallback')).toBe('my-workflow');
  });

  it('should append -1 when baseId conflicts', () => {
    expect(resolveCollisionId('my-workflow', new Set(['my-workflow']), 'fallback')).toBe(
      'my-workflow-1'
    );
  });

  it('should skip taken suffixes and find the first available', () => {
    const conflicts = new Set(['wf', 'wf-1', 'wf-2']);
    expect(resolveCollisionId('wf', conflicts, 'fallback')).toBe('wf-3');
  });

  it('should return fallbackId when all 100 suffixed candidates are taken', () => {
    const conflicts = new Set(['wf']);
    for (let i = 1; i <= 100; i++) {
      conflicts.add(`wf-${i}`);
    }
    expect(resolveCollisionId('wf', conflicts, 'my-fallback')).toBe('my-fallback');
  });

  it('should strip trailing hyphens from truncated base before appending suffix', () => {
    // A base ending in "-" at the truncation boundary should not produce "--1"
    const base = `${'a'.repeat(253)}-a`; // 255 chars
    const result = resolveCollisionId(base, new Set([base]), 'fallback');
    expect(result).not.toMatch(/--/);
    expect(result).toMatch(/-1$/);
  });
});

describe('buildSuffixedCandidate', () => {
  it('should append a numeric suffix to the base ID', () => {
    expect(buildSuffixedCandidate('my-workflow', 1)).toBe('my-workflow-1');
    expect(buildSuffixedCandidate('my-workflow', 42)).toBe('my-workflow-42');
    expect(buildSuffixedCandidate('my-workflow', 100)).toBe('my-workflow-100');
  });

  it('should truncate the base when base + suffix would exceed 255 characters', () => {
    const base = 'a'.repeat(255);
    const result = buildSuffixedCandidate(base, 1);
    expect(result).toBe(`${'a'.repeat(253)}-1`);
    expect(result.length).toBe(255);
  });

  it('should strip trailing hyphens after truncation to prevent double hyphens', () => {
    // 253 "a"s + "-a" = 255 chars. Truncating to 253 yields "aaa...a-",
    // which must become "aaa...a" + "-1", not "aaa...a-" + "-1" (double hyphen).
    const base = `${'a'.repeat(253)}-a`;
    const result = buildSuffixedCandidate(base, 1);
    expect(result).not.toMatch(/--/);
    expect(result).toMatch(/-1$/);
  });

  it('should handle multi-digit suffixes with correct truncation', () => {
    const base = 'a'.repeat(255);
    const result = buildSuffixedCandidate(base, 100);
    // suffix "-100" is 4 chars, so base is truncated to 251
    expect(result).toBe(`${'a'.repeat(251)}-100`);
    expect(result.length).toBe(255);
  });
});
