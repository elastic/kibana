/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';
import { formatSize, IGNORED_WATCH_PATTERNS } from './run_build';

const matchesIgnored = (filePath: string) => IGNORED_WATCH_PATTERNS.some((re) => re.test(filePath));

// Build OS-correct absolute-style paths so the same test runs on POSIX and Win32.
const p = (...segments: string[]) => Path.resolve(Path.sep, ...segments);

describe('formatSize', () => {
  it('formats bytes below 1024 as B', () => {
    expect(formatSize(0)).toBe('0 B');
    expect(formatSize(500)).toBe('500 B');
    expect(formatSize(1023)).toBe('1023 B');
  });

  it('formats bytes at 1024 boundary as KB', () => {
    expect(formatSize(1024)).toBe('1.0 KB');
  });

  it('formats kilobyte values with one decimal', () => {
    expect(formatSize(1536)).toBe('1.5 KB');
    expect(formatSize(10240)).toBe('10.0 KB');
  });

  it('formats bytes at MB boundary', () => {
    expect(formatSize(1024 * 1024)).toBe('1.00 MB');
  });

  it('formats megabyte values with two decimals', () => {
    expect(formatSize(5.5 * 1024 * 1024)).toBe('5.50 MB');
  });
});

describe('IGNORED_WATCH_PATTERNS', () => {
  describe('paths that should be ignored', () => {
    it.each([
      ['node_modules contents', p('repo', 'node_modules', 'react', 'index.js')],
      ['scoped node_modules', p('repo', 'node_modules', '@kbn', 'foo', 'index.js')],

      ['tsc declaration emit in target/types', p('repo', 'pkg', 'target', 'types', 'index.d.ts')],
      ['package target/ output dir', p('repo', 'pkg', 'target', 'public', 'bundles', 'x.js')],
      [
        'repo-root target/ output dir',
        p('repo', 'target', 'public', 'bundles', 'kibana.bundle.js'),
      ],

      ['tsbuildinfo at package root', p('repo', 'pkg', 'tsconfig.tsbuildinfo')],
      ['type_check tsbuildinfo variant', p('repo', 'pkg', 'tsconfig.type_check.tsbuildinfo')],

      ['unit test file (.test.ts)', p('repo', 'pkg', 'src', 'foo.test.ts')],
      ['unit test file (.test.tsx)', p('repo', 'pkg', 'src', 'foo.test.tsx')],
      ['unit test file (.test.js)', p('repo', 'pkg', 'src', 'foo.test.js')],
      ['spec test file (.spec.ts)', p('repo', 'pkg', 'src', 'foo.spec.ts')],
      ['spec test file (.spec.tsx)', p('repo', 'pkg', 'src', 'foo.spec.tsx')],
      ['spec test file (.spec.js)', p('repo', 'pkg', 'src', 'foo.spec.js')],
      ['storybook story', p('repo', 'pkg', 'src', 'foo.stories.tsx')],
      ['mock sibling', p('repo', 'pkg', 'src', 'foo.mock.ts')],

      ['__mocks__ dir', p('repo', 'pkg', 'src', '__mocks__', 'react.ts')],
      ['__snapshots__ dir', p('repo', 'pkg', 'src', '__snapshots__', 'foo.test.ts.snap')],
      ['__fixtures__ dir', p('repo', 'pkg', 'src', '__fixtures__', 'sample.json')],
      ['__jest__ dir', p('repo', 'pkg', 'src', '__jest__', 'setup.ts')],

      ['jest.config.js', p('repo', 'pkg', 'jest.config.js')],
      ['jest.config.ts', p('repo', 'pkg', 'jest.config.ts')],
      ['jest.integration.config.js', p('repo', 'pkg', 'jest.integration.config.js')],
    ])('ignores %s', (_label, filePath) => {
      expect(matchesIgnored(filePath)).toBe(true);
    });
  });

  describe('paths that must NOT be ignored', () => {
    it.each([
      ['production .ts source', p('repo', 'pkg', 'src', 'foo.ts')],
      ['production .tsx source', p('repo', 'pkg', 'src', 'foo.tsx')],
      ['plugin server entry', p('repo', 'pkg', 'server', 'index.ts')],

      // Filenames containing test-ish substrings but not test files
      ['test_utils dir is real source', p('repo', 'pkg', 'src', 'test_utils', 'foo.ts')],
      ['.testing.ts is not a test file', p('repo', 'pkg', 'src', 'foo.testing.ts')],
      ['mocks.ts (no dot prefix) is real source', p('repo', 'pkg', 'src', 'mocks.ts')],
      ['mock_utils.ts is real source', p('repo', 'pkg', 'src', 'mock_utils.ts')],

      // Files containing "target" in the name but not inside target/
      ['file named target.ts is real source', p('repo', 'pkg', 'src', 'target.ts')],
      ['targeting/ dir is real source', p('repo', 'pkg', 'src', 'targeting', 'foo.ts')],

      // Files containing "node_modules" in the name but not inside it
      ['file named node_modules.ts is real source', p('repo', 'pkg', 'src', 'node_modules.ts')],

      // Storybook config is a real .ts file (not part of prod graph either, but
      // the watcher seeing it is harmless and we don't want a too-greedy regex).
      ['storybook main.ts', p('repo', 'pkg', '.storybook', 'main.ts')],
    ])('keeps %s', (_label, filePath) => {
      expect(matchesIgnored(filePath)).toBe(false);
    });
  });
});
