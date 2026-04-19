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
  getTeamsForPath,
  extractImportsFromContent,
  addPackageIfValid,
  processFile,
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

    it('returns entries in reverse file order so the FIRST match wins (last-in-file precedence)', () => {
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

  describe('getTeamsForPath', () => {
    const repoRoot = path.resolve('/tmp/fake-repo');
    const abs = (p) => path.join(repoRoot, p);

    it('returns [] when no entries are supplied', () => {
      expect(getTeamsForPath(abs('src/foo.ts'), null, repoRoot)).toEqual([]);
    });

    it('returns [] when no repoRoot is supplied', () => {
      const entries = parseCodeOwners('src/foo @elastic/team-a');
      expect(getTeamsForPath(abs('src/foo.ts'), entries, null)).toEqual([]);
    });

    it('returns the matching entry teams', () => {
      const entries = parseCodeOwners('src/foo @elastic/team-a');
      expect(getTeamsForPath(abs('src/foo/file.ts'), entries, repoRoot)).toEqual([
        'elastic/team-a',
      ]);
    });

    it('returns [] when no entry matches', () => {
      const entries = parseCodeOwners('src/foo @elastic/team-a');
      expect(getTeamsForPath(abs('other/file.ts'), entries, repoRoot)).toEqual([]);
    });

    it('lower-in-file entries take precedence (more-specific override)', () => {
      const content = ['src/foo @elastic/general', 'src/foo/special @elastic/specific'].join('\n');
      const entries = parseCodeOwners(content);
      expect(getTeamsForPath(abs('src/foo/special/file.ts'), entries, repoRoot)).toEqual([
        'elastic/specific',
      ]);
      expect(getTeamsForPath(abs('src/foo/other/file.ts'), entries, repoRoot)).toEqual([
        'elastic/general',
      ]);
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

  describe('processFile', () => {
    let tempDir;
    let codeOwnersEntries;

    beforeAll(() => {
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'krrs-pf-'));
      // Single catch-all CODEOWNERS rule so any file under tempDir resolves to
      // the team-everyone owner. The no-owner test uses a separate empty entry list.
      codeOwnersEntries = parseCodeOwners('* @elastic/team-everyone');
    });

    afterAll(() => {
      if (tempDir) fs.rmSync(tempDir, { recursive: true, force: true });
    });

    it('returns `{ success: true, skipped: true }` when the file has no team owner', () => {
      // Empty entry list ⇒ getTeamsForPath returns [] ⇒ skip before any I/O.
      const filePath = path.join(tempDir, 'unowned.ts');
      fs.writeFileSync(filePath, "import x from 'lodash';", 'utf8');
      const result = processFile(filePath, 'unowned.ts', [], tempDir);
      expect(result).toEqual({ relativePath: 'unowned.ts', success: true, skipped: true });
    });

    it('returns `{ success: true, skipped: true }` when the file cannot be read', () => {
      // Discovery → process race: file deleted between `git grep` and worker
      // dispatch. readFileSync throws ENOENT, which we swallow and report skip.
      const result = processFile(
        path.join(tempDir, 'does-not-exist.ts'),
        'missing.ts',
        codeOwnersEntries,
        tempDir
      );
      expect(result).toEqual({ relativePath: 'missing.ts', success: true, skipped: true });
    });

    it('returns `{ success: true, skipped: true }` when the file is larger than MAX_FILE_SIZE', () => {
      // Buffer-length check (post-read) replaces the prior statSync check.
      // Padding with bytes that don't form import patterns keeps the result
      // attributable to the size guard, not to "no imports found".
      const filePath = path.join(tempDir, 'oversize.ts');
      const padding = 'x'.repeat(MAX_FILE_SIZE + 1);
      fs.writeFileSync(filePath, padding, 'utf8');
      const result = processFile(filePath, 'oversize.ts', codeOwnersEntries, tempDir);
      expect(result).toEqual({ relativePath: 'oversize.ts', success: true, skipped: true });
    });

    it('returns extracted imports + teams for an owned, in-size file', () => {
      const filePath = path.join(tempDir, 'normal.ts');
      fs.writeFileSync(filePath, "import x from 'lodash';\nconst y = require('axios');", 'utf8');
      const result = processFile(filePath, 'normal.ts', codeOwnersEntries, tempDir);
      expect(result).toEqual({
        relativePath: 'normal.ts',
        success: true,
        imports: ['lodash', 'axios'],
        teams: ['elastic/team-everyone'],
      });
    });

    it('returns `{ success: false, error }` when an internal helper throws', () => {
      // Malformed CODEOWNERS entry (no `matcher`) makes getTeamsForPath throw
      // on `.matcher.test(...)`. The outer catch must convert it into a per-file
      // failure rather than letting the worker thread die.
      const malformedEntries = [{ pattern: '*', teams: ['elastic/x'], matcher: null }];
      const result = processFile(
        path.join(tempDir, 'whatever.ts'),
        'whatever.ts',
        malformedEntries,
        tempDir
      );
      expect(result.success).toEqual(false);
      expect(result.relativePath).toEqual('whatever.ts');
      expect(typeof result.error).toEqual('string');
      expect(result.error.length).toBeGreaterThan(0);
    });
  });
});
