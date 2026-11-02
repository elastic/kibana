/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { HUMAN_READABLE_ID_MAX_LENGTH } from './constants';
import { buildSuffixedCandidate, buildCandidateIds, resolveCollisionId } from './collision';

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

describe('buildCandidateIds', () => {
  it('should return 101 candidates (base + 100 suffixed)', () => {
    const candidates = buildCandidateIds('my-workflow');
    expect(candidates).toHaveLength(101);
    expect(candidates[0]).toBe('my-workflow');
    expect(candidates[1]).toBe('my-workflow-1');
    expect(candidates[100]).toBe('my-workflow-100');
  });

  it('should truncate the base when suffix would exceed max length', () => {
    const longBase = 'a'.repeat(HUMAN_READABLE_ID_MAX_LENGTH);
    const candidates = buildCandidateIds(longBase);

    for (const candidate of candidates) {
      expect(candidate.length).toBeLessThanOrEqual(HUMAN_READABLE_ID_MAX_LENGTH);
    }

    // First suffixed candidate should end with -1 and be exactly max length
    expect(candidates[1]).toMatch(/-1$/);
    expect(candidates[1].length).toBe(HUMAN_READABLE_ID_MAX_LENGTH);
  });

  it('should ensure every candidate is unique for short base IDs', () => {
    const candidates = buildCandidateIds('test');
    const unique = new Set(candidates);
    expect(unique.size).toBe(candidates.length);
  });

  it('should ensure every candidate is unique when base ID ends with a hyphen-digit near max length', () => {
    // When baseId = <252 a's>-1 (254 chars), buildSuffixedCandidate(baseId, 1) would
    // truncate to 253 chars (<252 a's>-), strip the trailing hyphen, then append "-1"
    // — reconstructing the original baseId. The dedup guard must prevent this duplicate.
    const base = `${'a'.repeat(252)}-1`;
    expect(base.length).toBe(254);

    const candidates = buildCandidateIds(base);
    const unique = new Set(candidates);
    expect(unique.size).toBe(candidates.length);
  });

  it('should ensure every candidate is unique when base ID ends with a multi-digit suffix near max length', () => {
    // baseId = <252 a's>-10 (255 chars). buildSuffixedCandidate(baseId, 10) would
    // reconstruct the original after truncation + re-suffixing.
    const base = `${'a'.repeat(252)}-10`;
    expect(base.length).toBe(HUMAN_READABLE_ID_MAX_LENGTH);

    const candidates = buildCandidateIds(base);
    const unique = new Set(candidates);
    expect(unique.size).toBe(candidates.length);
  });

  it('should strip trailing hyphens from truncated base before appending suffix', () => {
    // Build a base that ends with a hyphen right at the truncation boundary.
    // e.g., 253 "a"s + "-a" = 255 chars. Truncating to 253 chars yields "aaa...a-"
    // which, without the fix, would produce "aaa...a--1" (double hyphen = invalid ID).
    const base = `${'a'.repeat(HUMAN_READABLE_ID_MAX_LENGTH - 2)}-a`;
    expect(base.length).toBe(HUMAN_READABLE_ID_MAX_LENGTH);

    const candidates = buildCandidateIds(base);

    // Every suffixed candidate must not contain consecutive hyphens
    for (let i = 1; i < candidates.length; i++) {
      expect(candidates[i]).not.toMatch(/--/);
      expect(candidates[i]).toMatch(/-\d+$/);
    }
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
