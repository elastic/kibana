/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

jest.mock('../../../sharded_jest_configs.json', () => ({
  'pkg/a/jest.config.js': 3,
  'pkg/b/jest.integration.config.js': 2,
  'pkg/c/jest.config.js': 1,
}));

jest.mock('../../../disabled_jest_configs.json', () => [], { virtual: false });

import { SHARD_ANNOTATION_SEP, expandShardedJestConfigs, globsForSolutions } from './jest_configs';

describe('expandShardedJestConfigs', () => {
  it('passes configs not in the shard map through unchanged', () => {
    expect(expandShardedJestConfigs(['pkg/x/jest.config.js'])).toEqual(['pkg/x/jest.config.js']);
  });

  it('expands a multi-shard config into N annotated entries', () => {
    expect(expandShardedJestConfigs(['pkg/a/jest.config.js'])).toEqual([
      `pkg/a/jest.config.js${SHARD_ANNOTATION_SEP}1/3`,
      `pkg/a/jest.config.js${SHARD_ANNOTATION_SEP}2/3`,
      `pkg/a/jest.config.js${SHARD_ANNOTATION_SEP}3/3`,
    ]);
  });

  it('does not expand configs with shardCount<=1', () => {
    expect(expandShardedJestConfigs(['pkg/c/jest.config.js'])).toEqual(['pkg/c/jest.config.js']);
  });

  it('preserves order across mixed sharded and non-sharded inputs', () => {
    const result = expandShardedJestConfigs([
      'pkg/x/jest.config.js',
      'pkg/b/jest.integration.config.js',
      'pkg/y/jest.config.js',
    ]);

    expect(result).toEqual([
      'pkg/x/jest.config.js',
      `pkg/b/jest.integration.config.js${SHARD_ANNOTATION_SEP}1/2`,
      `pkg/b/jest.integration.config.js${SHARD_ANNOTATION_SEP}2/2`,
      'pkg/y/jest.config.js',
    ]);
  });

  it('returns an empty array when given no input', () => {
    expect(expandShardedJestConfigs([])).toEqual([]);
  });
});

describe('globsForSolutions', () => {
  const PATTERNS = ['**/jest.config.js', '!**/__fixtures__/**'];

  it('returns patterns unchanged when limitSolutions is undefined', () => {
    expect(globsForSolutions(PATTERNS, undefined)).toEqual(PATTERNS);
  });

  it('prefixes positive patterns with solution and platform paths', () => {
    const result = globsForSolutions(PATTERNS, ['security']);
    expect(result).toContain('x-pack/solutions/security/**/jest.config.js');
    expect(result).toContain('src/**/jest.config.js');
    expect(result).toContain('x-pack/platform/**/jest.config.js');
  });

  it('keeps negation patterns unprefixed so globby treats them as exclusions', () => {
    const result = globsForSolutions(PATTERNS, ['security']);
    // must appear as-is, not as 'src/!**/__fixtures__/**' etc.
    expect(result).toContain('!**/__fixtures__/**');
    expect(result.filter((p) => p.startsWith('!'))).toEqual(['!**/__fixtures__/**']);
  });

  it('includes platform patterns even when multiple solutions are listed', () => {
    const result = globsForSolutions(PATTERNS, ['security', 'observability']);
    expect(result).toContain('src/**/jest.config.js');
    expect(result).toContain('x-pack/platform/**/jest.config.js');
  });
});
