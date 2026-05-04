/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { filterFtrConfigsBySelectiveTesting } from './selective_ftr';

const FOO_CONFIG = 'x-pack/test/foo/config.ts';
const FOO_OTHER_CONFIG = 'x-pack/test/foo/config_other.ts';
const BAR_CONFIG = 'x-pack/test/bar/config.ts';
const PLATFORM_CONFIG = 'x-pack/platform/test/baz/config.ts';

function buildMap(entries: Array<[string, string[]]>): Map<string, string[]> {
  return new Map(entries);
}

describe('filterFtrConfigsBySelectiveTesting', () => {
  it('narrows to a single config when only that config file changed', () => {
    const input = buildMap([['n2', [FOO_CONFIG, BAR_CONFIG]]]);

    const result = filterFtrConfigsBySelectiveTesting({
      ftrConfigsByQueue: input,
      prChangedFiles: [FOO_CONFIG],
    });

    expect(result.applied).toBe(true);
    expect(result.ftrConfigsByQueue.get('n2')).toEqual([FOO_CONFIG]);
  });

  it('narrows to a single config when a colocated spec file changed', () => {
    const input = buildMap([['n2', [FOO_CONFIG, BAR_CONFIG]]]);

    const result = filterFtrConfigsBySelectiveTesting({
      ftrConfigsByQueue: input,
      prChangedFiles: ['x-pack/test/foo/specs/a.spec.ts'],
    });

    expect(result.applied).toBe(true);
    expect(result.ftrConfigsByQueue.get('n2')).toEqual([FOO_CONFIG]);
  });

  it('keeps sibling configs when several configs share the same test root directory', () => {
    const input = buildMap([['n2', [FOO_CONFIG, FOO_OTHER_CONFIG, BAR_CONFIG]]]);

    const result = filterFtrConfigsBySelectiveTesting({
      ftrConfigsByQueue: input,
      prChangedFiles: ['x-pack/test/foo/specs/a.spec.ts'],
    });

    expect(result.applied).toBe(true);
    expect(result.ftrConfigsByQueue.get('n2')).toEqual([FOO_CONFIG, FOO_OTHER_CONFIG]);
  });

  it('bails out when a non-spec source file is changed', () => {
    const input = buildMap([['n2', [FOO_CONFIG, BAR_CONFIG]]]);

    const result = filterFtrConfigsBySelectiveTesting({
      ftrConfigsByQueue: input,
      prChangedFiles: [FOO_CONFIG, 'src/core/foo.ts'],
    });

    expect(result.applied).toBe(false);
    expect(result.reason).toContain('non-spec file');
    expect(result.ftrConfigsByQueue).toBe(input);
  });

  it('bails out when a non-spec file is changed inside a config-bearing dir', () => {
    const input = buildMap([['n2', [FOO_CONFIG]]]);

    const result = filterFtrConfigsBySelectiveTesting({
      ftrConfigsByQueue: input,
      // a service helper sitting next to the config — could be imported by any other suite
      prChangedFiles: ['x-pack/test/foo/services/helper.ts'],
    });

    expect(result.applied).toBe(false);
    expect(result.reason).toContain('non-spec file');
  });

  it('bails out when a spec file is outside any FTR config dir', () => {
    const input = buildMap([['n2', [FOO_CONFIG]]]);

    const result = filterFtrConfigsBySelectiveTesting({
      ftrConfigsByQueue: input,
      prChangedFiles: ['x-pack/test/services/shared.spec.ts'],
    });

    expect(result.applied).toBe(false);
    expect(result.reason).toContain('outside any FTR config dir');
  });

  it('preserves queue grouping across multiple queues', () => {
    const input = buildMap([
      ['n2', [FOO_CONFIG, BAR_CONFIG]],
      ['n2-virt', [PLATFORM_CONFIG]],
    ]);

    const result = filterFtrConfigsBySelectiveTesting({
      ftrConfigsByQueue: input,
      prChangedFiles: [
        'x-pack/test/foo/specs/a.spec.ts',
        'x-pack/platform/test/baz/specs/b.spec.ts',
      ],
    });

    expect(result.applied).toBe(true);
    expect(result.ftrConfigsByQueue.get('n2')).toEqual([FOO_CONFIG]);
    expect(result.ftrConfigsByQueue.get('n2-virt')).toEqual([PLATFORM_CONFIG]);
    expect(result.ftrConfigsByQueue.size).toBe(2);
  });

  it('drops queues entirely when none of their configs match', () => {
    const input = buildMap([
      ['n2', [FOO_CONFIG]],
      ['n2-virt', [PLATFORM_CONFIG]],
    ]);

    const result = filterFtrConfigsBySelectiveTesting({
      ftrConfigsByQueue: input,
      prChangedFiles: ['x-pack/test/foo/config.ts'],
    });

    expect(result.applied).toBe(true);
    expect(result.ftrConfigsByQueue.get('n2')).toEqual([FOO_CONFIG]);
    expect(result.ftrConfigsByQueue.has('n2-virt')).toBe(false);
  });

  it('bails out when there are no changed files', () => {
    const input = buildMap([['n2', [FOO_CONFIG]]]);

    const result = filterFtrConfigsBySelectiveTesting({
      ftrConfigsByQueue: input,
      prChangedFiles: [],
    });

    expect(result.applied).toBe(false);
    expect(result.ftrConfigsByQueue).toBe(input);
  });

  it('bails out when the queue map is empty', () => {
    const input = buildMap([]);

    const result = filterFtrConfigsBySelectiveTesting({
      ftrConfigsByQueue: input,
      prChangedFiles: [FOO_CONFIG],
    });

    expect(result.applied).toBe(false);
  });
});
