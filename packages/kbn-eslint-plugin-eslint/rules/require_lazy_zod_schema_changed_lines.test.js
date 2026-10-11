/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const { Linter } = require('eslint');
const rule = require('..').rules.require_lazy_zod_schema;
const changedLines = require('./require_lazy_zod_schema_changed_lines');

const linter = new Linter();
linter.defineParser('typescript', require('@typescript-eslint/parser'));
linter.defineRule('require_lazy_zod_schema', rule);

const config = {
  parser: 'typescript',
  parserOptions: { sourceType: 'module', ecmaVersion: 2022 },
  rules: { require_lazy_zod_schema: 'warn' },
};

afterEach(() => jest.restoreAllMocks());

describe('changed-line scope for require_lazy_zod_schema', () => {
  it('fixes both a changed schema factory used as a schema and an eager schema', () => {
    jest.spyOn(changedLines, 'getChangedLines').mockReturnValue([
      { start: 2, end: 2 },
      { start: 3, end: 3 },
    ]);
    const code = [
      "import { z, lazySchema } from '@kbn/zod';",
      'const IpAddressSchema = () => z.union([z.string(), z.number()]);',
      "export const Connector = { input: z.object({ ip: IpAddressSchema.describe('ip') }) };",
    ].join('\n');

    expect(linter.verifyAndFix(code, config, 'schema.ts')).toEqual(
      expect.objectContaining({
        fixed: true,
        output: [
          "import { z, lazySchema } from '@kbn/zod';",
          'const IpAddressSchema = lazySchema(() => z.union([z.string(), z.number()]));',
          "export const Connector = { input: lazySchema(() => z.object({ ip: IpAddressSchema.describe('ip') })) };",
        ].join('\n'),
      })
    );
  });

  it('leaves existing schemas alone when a new schema is added', () => {
    jest.spyOn(changedLines, 'getChangedLines').mockReturnValue([{ start: 3, end: 3 }]);
    const code = [
      "import { z } from '@kbn/zod';",
      'const Existing = z.object({});',
      'const Added = z.string();',
    ].join('\n');

    expect(linter.verify(code, config, 'schema.ts')).toEqual([
      expect.objectContaining({ messageId: 'eagerZodSchema', line: 3 }),
    ]);
    expect(linter.verifyAndFix(code, config, 'schema.ts').output).toBe(
      [
        "import { z, lazySchema } from '@kbn/zod';",
        'const Existing = z.object({});',
        'const Added = lazySchema(() => z.string());',
      ].join('\n')
    );
  });

  it('fixes a changed schema factory call but leaves old schemas alone', () => {
    jest.spyOn(changedLines, 'getChangedLines').mockReturnValue([{ start: 4, end: 4 }]);
    const code = [
      "import { z } from '@kbn/zod';",
      'const makeSchema = () => z.string();',
      'const Existing = z.object({});',
      'const Added = makeSchema();',
    ].join('\n');

    expect(linter.verify(code, config, 'schema.ts')).toEqual([
      expect.objectContaining({ messageId: 'eagerDerivedZodSchema', line: 4 }),
    ]);
    expect(linter.verifyAndFix(code, config, 'schema.ts').output).toBe(
      [
        "import { z, lazySchema } from '@kbn/zod';",
        'const makeSchema = () => z.string();',
        'const Existing = z.object({});',
        'const Added = lazySchema(() => makeSchema());',
      ].join('\n')
    );
  });

  it('checks a schema when one of its inner lines changes', () => {
    jest.spyOn(changedLines, 'getChangedLines').mockReturnValue([{ start: 4, end: 4 }]);
    const code = [
      "import { z } from '@kbn/zod';",
      'const Existing = z.object({});',
      'const Edited = z.object({',
      '  value: z.string(),',
      '});',
    ].join('\n');

    expect(linter.verify(code, config, 'schema.ts')).toEqual([
      expect.objectContaining({ messageId: 'eagerZodSchema', line: 3 }),
    ]);
  });

  it('checks only the changed property in a schema map', () => {
    jest.spyOn(changedLines, 'getChangedLines').mockReturnValue([{ start: 5, end: 5 }]);
    const code = [
      "import { z } from '@kbn/zod';",
      'const Schemas = {',
      '  existing: z.object({}),',
      '  edited: z.object({',
      '    value: z.string(),',
      '  }),',
      '};',
    ].join('\n');

    expect(linter.verify(code, config, 'schema.ts')).toEqual([
      expect.objectContaining({ messageId: 'eagerZodSchema', line: 4 }),
    ]);
  });

  it('does not report schemas when no lines changed', () => {
    jest.spyOn(changedLines, 'getChangedLines').mockReturnValue([]);
    const code = "import { z } from '@kbn/zod';\nconst Existing = z.object({});";

    expect(linter.verify(code, config, 'schema.ts')).toEqual([]);
    expect(linter.verifyAndFix(code, config, 'schema.ts').output).toBe(code);
  });

  it('leaves an unchanged schema factory alone', () => {
    jest.spyOn(changedLines, 'getChangedLines').mockReturnValue([{ start: 1, end: 1 }]);
    const code = [
      "import { z } from '@kbn/zod';",
      'const Existing = () => z.object({});',
      "Existing.describe('schema');",
    ].join('\n');

    expect(linter.verify(code, config, 'schema.ts')).toEqual([]);
  });

  it('keeps an unchanged declaration moved into an added file and reports a new enum', () => {
    jest.spyOn(changedLines, 'getChangedLines').mockReturnValue([{ start: 2, end: 3 }]);
    jest
      .spyOn(changedLines, 'isUnchangedInAddedFile')
      .mockImplementation((_filename, declaration) => declaration.includes('Moved = z.enum'));
    const code = [
      "import { z } from '@kbn/zod';",
      "export const Moved = z.enum(['a', 'b']);",
      "export const Added = z.enum(['c', 'd']);",
    ].join('\n');

    expect(linter.verify(code, config, 'schema.ts')).toEqual([
      expect.objectContaining({ messageId: 'eagerZodSchema', line: 3 }),
    ]);
  });

  it('does not treat a changed declaration as an unchanged moved schema', () => {
    jest.spyOn(changedLines, 'getChangedLines').mockReturnValue([{ start: 2, end: 2 }]);
    jest.spyOn(changedLines, 'isUnchangedInAddedFile').mockReturnValue(false);
    const code = ["import { z } from '@kbn/zod';", "export const Moved = z.enum(['a', 'c']);"].join(
      '\n'
    );

    expect(linter.verify(code, config, 'schema.ts')).toEqual([
      expect.objectContaining({ messageId: 'eagerZodSchema', line: 2 }),
    ]);
  });
});

describe('Git diff hunk lines', () => {
  it('keeps the source path of a renamed file', () => {
    expect(changedLines.parseChangedFiles('R100\0old.ts\0new.ts\0M\0other.ts\0')).toEqual({
      changedFiles: new Set(['new.ts', 'other.ts']),
      addedFiles: new Set(),
      baseSourceFiles: new Set(['old.ts', 'other.ts']),
      renamedFiles: new Map([['new.ts', 'old.ts']]),
    });
  });

  it('tracks added files separately from renamed files', () => {
    expect(changedLines.parseChangedFiles('A\0new.ts\0R100\0old.ts\0renamed.ts\0')).toEqual({
      changedFiles: new Set(['new.ts', 'renamed.ts']),
      addedFiles: new Set(['new.ts']),
      baseSourceFiles: new Set(['old.ts']),
      renamedFiles: new Map([['renamed.ts', 'old.ts']]),
    });
  });

  it('includes added lines and the anchor of a deletion', () => {
    expect(
      changedLines.parseChangedLines('@@ -5,0 +6,2 @@\n+one\n+two\n@@ -10,1 +11,0 @@\n-removed\n')
    ).toEqual([
      { start: 6, end: 7 },
      { start: 11, end: 11 },
    ]);
  });

  it('keeps removed source declarations in contiguous chunks', () => {
    expect(
      changedLines.parseRemovedSourceChunks(
        "@@ -1,2 +0,0 @@\n-export const Moved =\n-  z.enum(['a']);\n@@ -5 +3,0 @@\n-const Other = true;\n"
      )
    ).toEqual(["export const Moved =\n  z.enum(['a']);", 'const Other = true;']);
  });

  it('matches an exact moved declaration and rejects a changed declaration', () => {
    const removed = ["export const Moved = z.enum(['a', 'b']);"];
    expect(
      changedLines.isDeclarationInRemovedSource("const Moved = z.enum(['a', 'b']);", removed)
    ).toBe(true);
    expect(
      changedLines.isDeclarationInRemovedSource("const Moved = z.enum(['a', 'c']);", removed)
    ).toBe(false);
  });

  it('does not match a function-local declaration removed from the base file', () => {
    const removed = ["  const Local = z.enum(['a', 'b']);"];
    expect(changedLines.isDeclarationInRemovedSource("Local = z.enum(['a', 'b']);", removed)).toBe(
      false
    );
  });

  it('matches a module-level declaration written without the const keyword prefix', () => {
    const removed = ["export const Moved = z.enum(['a', 'b']);"];
    expect(changedLines.isDeclarationInRemovedSource("Moved = z.enum(['a', 'b']);", removed)).toBe(
      true
    );
  });
});

describe('unsaved editor buffer', () => {
  it('treats every line as changed when the linted text differs from disk', () => {
    expect(changedLines.getChangedLines(__filename, 'const unsaved = true;')).toBeNull();
  });
});
