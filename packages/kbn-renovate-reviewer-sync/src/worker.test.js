/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const path = require('path');
const fs = require('fs');
const os = require('os');
const {
  parseCodeOwners,
  compileLookupIndex,
  getTeamsForPath,
  extractImportsFromContent,
  addPackageIfValid,
  processFileAsync,
  runBatchAsync,
  MAX_FILE_SIZE,
} = require('./worker');

describe('worker', () => {
  describe('parseCodeOwners', () => {
    it('returns an empty list for empty content', () => {
      expect(parseCodeOwners('')).toEqual([]);
    });

    it('skips comment-only and blank lines', () => {
      const content = ['# header', '', '   ', '# another comment'].join('\n');
      expect(parseCodeOwners(content)).toEqual([]);
    });

    it('skips lines containing @kibanamachine (the bot is not a real owner)', () => {
      const content = 'src/foo @kibanamachine @elastic/team-a';
      expect(parseCodeOwners(content)).toEqual([]);
    });

    it('drops entries with no team owners', () => {
      const content = 'src/foo';
      expect(parseCodeOwners(content)).toEqual([]);
    });

    it('strips inline comments and the @ prefix from team names', () => {
      const content = 'src/foo @elastic/team-a # owned by team-a';
      const entries = parseCodeOwners(content);
      expect(entries).toHaveLength(1);
      expect(entries[0]).toMatchObject({
        pattern: 'src/foo',
        teams: ['elastic/team-a'],
      });
    });

    it('removes a single trailing slash from the pattern', () => {
      const content = 'src/foo/ @elastic/team-a';
      const entries = parseCodeOwners(content);
      expect(entries[0].pattern).toEqual('src/foo');
    });

    it('handles CRLF line endings', () => {
      const content = 'src/a @elastic/a\r\nsrc/b @elastic/b\r\n';
      const entries = parseCodeOwners(content);
      expect(entries.map((e) => e.pattern)).toEqual(['src/b', 'src/a']);
    });

    it('returns entries in reverse file order so later compiled-index processing can score by line index', () => {
      const content = ['src/foo @elastic/general', 'src/foo/bar @elastic/specific'].join('\n');
      const entries = parseCodeOwners(content);
      expect(entries.map((e) => e.pattern)).toEqual(['src/foo/bar', 'src/foo']);
    });

    it('supports multiple teams per entry', () => {
      const content = 'src/foo @elastic/team-a @elastic/team-b';
      const entries = parseCodeOwners(content);
      expect(entries[0].teams).toEqual(['elastic/team-a', 'elastic/team-b']);
    });
  });

  describe('compileLookupIndex + getTeamsForPath', () => {
    const repoRoot = path.resolve('/tmp/fake-repo');
    const abs = (p) => path.join(repoRoot, p);

    const compile = (content) => compileLookupIndex(parseCodeOwners(content));

    it('returns [] when no entries are supplied (null index)', () => {
      expect(getTeamsForPath(abs('src/foo.ts'), null, repoRoot)).toEqual([]);
    });

    it('returns [] when no repoRoot is supplied', () => {
      const index = compile('src/foo @elastic/team-a');
      expect(getTeamsForPath(abs('src/foo.ts'), index, null)).toEqual([]);
    });

    it('returns the matching team for a literal directory-prefix pattern', () => {
      const index = compile('src/foo @elastic/team-a');
      expect(getTeamsForPath(abs('src/foo/file.ts'), index, repoRoot)).toEqual(['elastic/team-a']);
    });

    it('returns [] when no entry matches', () => {
      const index = compile('src/foo @elastic/team-a');
      expect(getTeamsForPath(abs('other/file.ts'), index, repoRoot)).toEqual([]);
    });

    it('matches the exact path AND descendants for non-glob prefix patterns', () => {
      const index = compile('src/foo @elastic/team-a');
      expect(getTeamsForPath(abs('src/foo'), index, repoRoot)).toEqual(['elastic/team-a']);
      expect(getTeamsForPath(abs('src/foo/sub/deep.ts'), index, repoRoot)).toEqual([
        'elastic/team-a',
      ]);
    });

    it('lower-in-file entries take precedence over earlier ones (last-wins)', () => {
      const index = compile(
        ['src/foo @elastic/general', 'src/foo/special @elastic/specific'].join('\n')
      );
      expect(getTeamsForPath(abs('src/foo/special/file.ts'), index, repoRoot)).toEqual([
        'elastic/specific',
      ]);
      expect(getTeamsForPath(abs('src/foo/other/file.ts'), index, repoRoot)).toEqual([
        'elastic/general',
      ]);
    });

    it('routes glob patterns through the globEntries pool, not the trie', () => {
      const index = compile('**/*.scss @elastic/styles');
      expect(index.globEntries).toHaveLength(1);
      expect(index.trie.children.size).toBe(0);
      expect(getTeamsForPath(abs('src/foo/bar.scss'), index, repoRoot)).toEqual(['elastic/styles']);
      expect(getTeamsForPath(abs('src/foo/bar.ts'), index, repoRoot)).toEqual([]);
    });

    it('routes basename-only patterns (no slash) through the glob pool', () => {
      // Patterns without `/` match anywhere in gitignore semantics — they
      // can't be anchored to a single trie position. Compile-time check.
      const index = compile('.cursorignore @elastic/dx');
      expect(index.globEntries).toHaveLength(1);
      expect(getTeamsForPath(abs('.cursorignore'), index, repoRoot)).toEqual(['elastic/dx']);
    });

    it('drops `!`-negation patterns (a single-pattern matcher has nothing to negate)', () => {
      const index = compile(
        ['src/foo @elastic/team-a', '!src/foo/bar.ts @elastic/wont-fire'].join('\n')
      );
      expect(getTeamsForPath(abs('src/foo/bar.ts'), index, repoRoot)).toEqual(['elastic/team-a']);
      expect(index.globEntries.find((e) => e.pattern.startsWith('!'))).toBeUndefined();
    });

    it('compares trie hits and glob hits by line index (later wins across pools)', () => {
      // Trie hit comes first in the file, glob hit comes second — the glob
      // entry should win because it appears later (higher lineIndex).
      const index = compile(
        ['src/foo @elastic/dir-team', '**/*.snapshot @elastic/snapshot-team'].join('\n')
      );
      expect(getTeamsForPath(abs('src/foo/file.snapshot'), index, repoRoot)).toEqual([
        'elastic/snapshot-team',
      ]);
      expect(getTeamsForPath(abs('src/foo/file.ts'), index, repoRoot)).toEqual([
        'elastic/dir-team',
      ]);
    });

    it('handles a leading-slash anchored prefix the same as no leading slash', () => {
      const index = compile('/src/foo @elastic/team-a');
      expect(getTeamsForPath(abs('src/foo/file.ts'), index, repoRoot)).toEqual(['elastic/team-a']);
    });

    it('preserves multi-team output', () => {
      const index = compile('src/foo @elastic/a @elastic/b');
      expect(getTeamsForPath(abs('src/foo/file.ts'), index, repoRoot)).toEqual([
        'elastic/a',
        'elastic/b',
      ]);
    });

    it('resolves a mixed corpus correctly across both pools', () => {
      // End-to-end behavioral check across the split storage: literal-prefix
      // entries land in the trie, glob entries land in `globEntries`, and
      // line-index scoring picks the correct winner regardless of which pool
      // the candidates came from. Any future refactor of the split must keep
      // these expectations stable.
      const content = [
        'src/foo @elastic/dir-team',
        'src/foo/special @elastic/specific',
        '**/*.scss @elastic/styles',
        '/src/anchored @elastic/anchored-team',
        'examples/x @elastic/examples',
      ].join('\n');
      const index = compileLookupIndex(parseCodeOwners(content));
      expect(getTeamsForPath(abs('src/foo/anything.ts'), index, repoRoot)).toEqual([
        'elastic/dir-team',
      ]);
      expect(getTeamsForPath(abs('src/foo/special/file.ts'), index, repoRoot)).toEqual([
        'elastic/specific',
      ]);
      expect(getTeamsForPath(abs('src/styles/main.scss'), index, repoRoot)).toEqual([
        'elastic/styles',
      ]);
      expect(getTeamsForPath(abs('src/anchored/whatever.ts'), index, repoRoot)).toEqual([
        'elastic/anchored-team',
      ]);
      expect(getTeamsForPath(abs('examples/x/y/z.ts'), index, repoRoot)).toEqual([
        'elastic/examples',
      ]);
      expect(getTeamsForPath(abs('unrelated/file.ts'), index, repoRoot)).toEqual([]);
    });
  });

  describe('addPackageIfValid', () => {
    const collect = (importPath) => {
      const set = new Set();
      addPackageIfValid(importPath, set);
      return Array.from(set);
    };

    it('adds an unscoped package name', () => {
      expect(collect('lodash')).toEqual(['lodash']);
    });

    it('adds only the package name from a scoped subpath', () => {
      expect(collect('@elastic/eui/lib/something')).toEqual(['@elastic/eui']);
    });

    it('adds only the first segment from an unscoped subpath', () => {
      expect(collect('react-dom/client')).toEqual(['react-dom']);
    });

    it('rejects relative imports', () => {
      expect(collect('./foo')).toEqual([]);
      expect(collect('../bar/baz')).toEqual([]);
    });

    it('rejects @kbn/* internal packages', () => {
      expect(collect('@kbn/dev-cli-runner')).toEqual([]);
    });

    it('rejects empty strings', () => {
      expect(collect('')).toEqual([]);
    });
  });

  describe('extractImportsFromContent', () => {
    it('extracts a default import', () => {
      expect(extractImportsFromContent("import lodash from 'lodash';")).toEqual(['lodash']);
    });

    it('extracts a named import', () => {
      expect(extractImportsFromContent("import { merge } from 'lodash';")).toEqual(['lodash']);
    });

    it('extracts a namespace import', () => {
      expect(extractImportsFromContent("import * as React from 'react';")).toEqual(['react']);
    });

    it('extracts a side-effect-only import', () => {
      expect(extractImportsFromContent("import 'core-js';")).toEqual(['core-js']);
    });

    it('extracts a type-only import', () => {
      expect(extractImportsFromContent("import type { Foo } from 'some-pkg';")).toEqual([
        'some-pkg',
      ]);
    });

    it('extracts a multiline import', () => {
      const content = "import {\n  a,\n  b,\n} from 'multi-line-pkg';";
      expect(extractImportsFromContent(content)).toEqual(['multi-line-pkg']);
    });

    it('extracts dynamic imports', () => {
      expect(extractImportsFromContent("const m = await import('dyn-pkg');")).toEqual(['dyn-pkg']);
    });

    it('extracts CommonJS requires', () => {
      expect(extractImportsFromContent("const x = require('cjs-pkg');")).toEqual(['cjs-pkg']);
    });

    it('extracts re-exports (export ... from)', () => {
      expect(extractImportsFromContent("export { foo } from 'reexport-pkg';")).toEqual([
        'reexport-pkg',
      ]);
    });

    it('extracts star re-exports (export * from)', () => {
      expect(extractImportsFromContent("export * from 'star-reexport';")).toEqual([
        'star-reexport',
      ]);
    });

    it('extracts scoped packages keeping only the @scope/name', () => {
      expect(extractImportsFromContent("import { EuiFlexGroup } from '@elastic/eui';")).toEqual([
        '@elastic/eui',
      ]);
      expect(extractImportsFromContent("import x from '@elastic/eui/lib/sub';")).toEqual([
        '@elastic/eui',
      ]);
    });

    it('extracts unscoped subpaths keeping only the first segment', () => {
      expect(extractImportsFromContent("import x from 'react-dom/client';")).toEqual(['react-dom']);
    });

    it('ignores relative imports', () => {
      const content = "import x from './foo';\nimport y from '../bar/baz';";
      expect(extractImportsFromContent(content)).toEqual([]);
    });

    it('ignores @kbn/* internal packages', () => {
      expect(extractImportsFromContent("import { a } from '@kbn/dev-cli-runner';")).toEqual([]);
    });

    it('deduplicates packages imported via multiple syntaxes in one file', () => {
      const content = [
        "import x from 'lodash';",
        "const y = require('lodash');",
        "export { merge } from 'lodash';",
        "const z = await import('lodash');",
      ].join('\n');
      expect(extractImportsFromContent(content)).toEqual(['lodash']);
    });

    it('extracts multiple distinct packages preserving insertion order', () => {
      const content = [
        "import a from 'pkg-a';",
        "import b from 'pkg-b';",
        "import c from 'pkg-c';",
      ].join('\n');
      expect(extractImportsFromContent(content)).toEqual(['pkg-a', 'pkg-b', 'pkg-c']);
    });

    it('returns [] for content with no imports', () => {
      expect(extractImportsFromContent('const x = 1; function f() { return x; }')).toEqual([]);
    });

    it('resets the global regex `lastIndex` between calls (reentrancy guard)', () => {
      // The combined regex is module-level with the /g flag, which carries
      // mutable `lastIndex` state. Two consecutive calls with non-empty content
      // must each scan their own input from offset 0.
      expect(extractImportsFromContent("import x from 'pkg-first';")).toEqual(['pkg-first']);
      expect(extractImportsFromContent("import y from 'pkg-second';")).toEqual(['pkg-second']);
    });

    it('produces stable output across many consecutive invocations', () => {
      // Catches a subtle class of bugs where `lastIndex` reset is conditional
      // (e.g. resets only after a no-match pass). 50 iterations is overkill but
      // cheap; the assertion stays trivial.
      for (let i = 0; i < 50; i++) {
        expect(extractImportsFromContent("import a from 'lodash';")).toEqual(['lodash']);
      }
    });
  });

  describe('processFileAsync', () => {
    let tempDir;
    let codeOwnersIndex;

    beforeAll(() => {
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'krrs-pfa-'));
      // Single catch-all rule compiled into the fast index — the production
      // runtime shape. The no-owner test uses a separate empty index below.
      codeOwnersIndex = compileLookupIndex(parseCodeOwners('* @elastic/team-everyone'));
    });

    afterAll(() => {
      if (tempDir) fs.rmSync(tempDir, { recursive: true, force: true });
    });

    it('returns `{ success: true, skipped: true }` when the file has no team owner', async () => {
      const filePath = path.join(tempDir, 'unowned-async.ts');
      fs.writeFileSync(filePath, "import x from 'lodash';", 'utf8');
      // Empty index ⇒ no match ⇒ skip before any I/O.
      const emptyIndex = compileLookupIndex([]);
      const result = await processFileAsync(filePath, 'unowned-async.ts', emptyIndex, tempDir);
      expect(result).toEqual({ relativePath: 'unowned-async.ts', success: true, skipped: true });
    });

    it('returns `{ success: true, skipped: true }` when the file cannot be read', async () => {
      // Discovery → process race: file deleted between `git grep` and worker
      // dispatch. fs.promises.readFile rejects with ENOENT, which we swallow
      // and report as a skip.
      const result = await processFileAsync(
        path.join(tempDir, 'does-not-exist-async.ts'),
        'missing-async.ts',
        codeOwnersIndex,
        tempDir
      );
      expect(result).toEqual({ relativePath: 'missing-async.ts', success: true, skipped: true });
    });

    it('returns `{ success: true, skipped: true }` when the file is larger than MAX_FILE_SIZE', async () => {
      // Buffer-length check (post-read). Padding with bytes that don't form
      // import patterns keeps the result attributable to the size guard, not
      // to "no imports found".
      const filePath = path.join(tempDir, 'oversize-async.ts');
      const padding = 'x'.repeat(MAX_FILE_SIZE + 1);
      fs.writeFileSync(filePath, padding, 'utf8');
      const result = await processFileAsync(
        filePath,
        'oversize-async.ts',
        codeOwnersIndex,
        tempDir
      );
      expect(result).toEqual({ relativePath: 'oversize-async.ts', success: true, skipped: true });
    });

    it('returns extracted imports + teams for an owned, in-size file', async () => {
      const filePath = path.join(tempDir, 'normal-async.ts');
      fs.writeFileSync(filePath, "import x from 'lodash';\nconst y = require('axios');", 'utf8');
      const result = await processFileAsync(filePath, 'normal-async.ts', codeOwnersIndex, tempDir);
      expect(result).toEqual({
        relativePath: 'normal-async.ts',
        success: true,
        imports: ['lodash', 'axios'],
        teams: ['elastic/team-everyone'],
      });
    });

    it('returns `{ success: false, error }` when an internal helper throws', async () => {
      // A glob entry with a null `matcher` makes getTeamsForPath throw on
      // `entry.matcher.test(...)`. The outer catch must convert it into a
      // per-file failure rather than letting the worker thread die.
      const malformedIndex = {
        trie: { children: new Map(), match: null },
        globEntries: [{ pattern: '*', teams: ['elastic/x'], matcher: null, lineIndex: 0 }],
      };
      const filePath = path.join(tempDir, 'malformed.ts');
      fs.writeFileSync(filePath, "import x from 'lodash';", 'utf8');
      const result = await processFileAsync(filePath, 'malformed.ts', malformedIndex, tempDir);
      expect(result.success).toEqual(false);
      expect(result.relativePath).toEqual('malformed.ts');
      expect(typeof result.error).toEqual('string');
      expect(result.error.length).toBeGreaterThan(0);
    });
  });

  describe('runBatchAsync', () => {
    let tempDir;
    let codeOwnersIndex;

    beforeAll(() => {
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'krrs-rba-'));
      codeOwnersIndex = compileLookupIndex(parseCodeOwners('* @elastic/team-everyone'));
    });

    afterAll(() => {
      if (tempDir) fs.rmSync(tempDir, { recursive: true, force: true });
    });

    it('returns [] for an empty batch without spawning any concurrent tasks', async () => {
      const results = await runBatchAsync([], codeOwnersIndex, tempDir);
      expect(results).toEqual([]);
    });

    it('preserves input order in the results array even with concurrent reads', async () => {
      // Order is load-bearing: the worker pool aligns each `result[i]` back
      // to the corresponding `files[i]` it dispatched. Any reordering here
      // would silently mis-attribute imports to wrong relativePaths.
      const files = [];
      for (let i = 0; i < 32; i++) {
        const fp = path.join(tempDir, `f-${i}.ts`);
        // Vary file size so reads complete out-of-order under libuv.
        const size = (i % 4) * 2048 + 64;
        const padding = 'x'.repeat(size);
        fs.writeFileSync(fp, `import pkg${i} from 'pkg-${i}';\n${padding}`, 'utf8');
        files.push({ filePath: fp, relativePath: `f-${i}.ts` });
      }
      const results = await runBatchAsync(files, codeOwnersIndex, tempDir);
      expect(results).toHaveLength(32);
      for (let i = 0; i < 32; i++) {
        expect(results[i].relativePath).toEqual(`f-${i}.ts`);
        expect(results[i].imports).toEqual([`pkg-${i}`]);
      }
    });

    it('mixes successful, skipped, and missing files in one batch', async () => {
      const okPath = path.join(tempDir, 'mix-ok.ts');
      fs.writeFileSync(okPath, "import x from 'lodash';", 'utf8');
      const oversizePath = path.join(tempDir, 'mix-oversize.ts');
      fs.writeFileSync(oversizePath, 'x'.repeat(MAX_FILE_SIZE + 1), 'utf8');
      const missingPath = path.join(tempDir, 'mix-missing.ts');

      const files = [
        { filePath: okPath, relativePath: 'mix-ok.ts' },
        { filePath: oversizePath, relativePath: 'mix-oversize.ts' },
        { filePath: missingPath, relativePath: 'mix-missing.ts' },
      ];
      const [ok, oversize, missing] = await runBatchAsync(files, codeOwnersIndex, tempDir);
      expect(ok).toMatchObject({ success: true, imports: ['lodash'] });
      expect(oversize).toMatchObject({ success: true, skipped: true });
      expect(missing).toMatchObject({ success: true, skipped: true });
    });
  });
});
