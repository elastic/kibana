/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import type { FlagsReader } from '@kbn/dev-cli-runner';
import type { ToolingLog } from '@kbn/tooling-log';

import { runResolveTestingScope } from './resolve_testing_scope';
import { readScoutTestingScope } from '../tests_discovery/testing_scope';

describe('runResolveTestingScope', () => {
  let tmpRoot: string;
  let flagsReader: jest.Mocked<FlagsReader>;
  let log: jest.Mocked<ToolingLog>;
  let codeChangesPath: string;
  let scopeOutputPath: string;

  const writeCodeChanges = (changedFiles: string[], affectedModules: string[]): void => {
    fs.writeFileSync(
      codeChangesPath,
      JSON.stringify({ mergeBase: 'abc123', changedFiles, affectedModules })
    );
  };

  const setFlags = (overrides: {
    codeChanges?: string;
    scopeOutput?: string;
    selectiveTesting?: boolean;
  }) => {
    flagsReader.string.mockImplementation((name: string) => {
      if (name === 'code-changes') return overrides.codeChanges ?? '';
      if (name === 'scope-output') return overrides.scopeOutput ?? '';
      return '';
    });
    flagsReader.requiredString.mockImplementation((name: string) => {
      if (name === 'scope-output') return overrides.scopeOutput ?? scopeOutputPath;
      throw new Error(`unexpected requiredString flag: ${name}`);
    });
    flagsReader.boolean.mockImplementation((name: string) => {
      if (name === 'selective-testing') return overrides.selectiveTesting ?? false;
      return false;
    });
  };

  beforeEach(() => {
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'scout-resolve-testing-scope-'));
    codeChangesPath = path.join(tmpRoot, 'code_changes.json');
    scopeOutputPath = path.join(tmpRoot, 'testing_scope.json');

    flagsReader = {
      string: jest.fn(),
      requiredString: jest.fn(),
      boolean: jest.fn(),
    } as any;

    log = {
      info: jest.fn(),
      warning: jest.fn(),
      error: jest.fn(),
    } as any;
  });

  afterEach(() => {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  });

  it('writes a full/selective-disabled scope when --selective-testing is off', () => {
    writeCodeChanges(['some/file.ts'], ['@kbn/foo', '@kbn/bar']);
    setFlags({ codeChanges: codeChangesPath, scopeOutput: scopeOutputPath });

    runResolveTestingScope(flagsReader, log);

    expect(readScoutTestingScope(scopeOutputPath)).toEqual({
      kind: 'full',
      reason: 'selective-disabled',
      affectedModules: ['@kbn/bar', '@kbn/foo'],
    });
    expect(log.info).toHaveBeenCalledWith(expect.stringContaining(scopeOutputPath));
  });

  it('writes a full/selective-disabled scope (no modules) when --code-changes is omitted', () => {
    setFlags({ scopeOutput: scopeOutputPath });

    runResolveTestingScope(flagsReader, log);

    expect(readScoutTestingScope(scopeOutputPath)).toEqual({
      kind: 'full',
      reason: 'selective-disabled',
      affectedModules: [],
    });
  });

  it('writes a full/critical-files scope when a critical Scout file is touched', () => {
    writeCodeChanges(
      ['src/platform/packages/shared/kbn-scout/src/runner/index.ts'],
      ['@kbn/scout']
    );
    setFlags({
      codeChanges: codeChangesPath,
      scopeOutput: scopeOutputPath,
      selectiveTesting: true,
    });

    runResolveTestingScope(flagsReader, log);

    expect(readScoutTestingScope(scopeOutputPath)).toEqual({
      kind: 'full',
      reason: 'critical-files',
      affectedModules: ['@kbn/scout'],
    });
  });

  it('writes a tests-only scope for a Scout-tests-only diff', () => {
    // We can't override REPO_ROOT trivially here; the test asserts the
    // kind=tests-only outcome plus the affectedModules pass-through.
    // affectedConfigs may be empty if the on-disk resolver lookup misses tmpRoot.
    writeCodeChanges(['pkg/test/scout/ui/tests/foo.spec.ts'], ['@kbn/pkg']);
    setFlags({
      codeChanges: codeChangesPath,
      scopeOutput: scopeOutputPath,
      selectiveTesting: true,
    });

    runResolveTestingScope(flagsReader, log);
    const written = readScoutTestingScope(scopeOutputPath);

    expect(written.kind).toBe('tests-only');
    expect(written.affectedModules).toEqual(['@kbn/pkg']);
  });

  it('writes a dependency-tree scope for a mixed source+test diff', () => {
    writeCodeChanges(
      ['pkg/test/scout/ui/tests/foo.spec.ts', 'pkg/public/foo.ts'],
      ['@kbn/foo', '@kbn/bar']
    );
    setFlags({
      codeChanges: codeChangesPath,
      scopeOutput: scopeOutputPath,
      selectiveTesting: true,
    });

    runResolveTestingScope(flagsReader, log);

    expect(readScoutTestingScope(scopeOutputPath)).toEqual({
      kind: 'dependency-tree',
      affectedModules: ['@kbn/bar', '@kbn/foo'],
    });
  });

  it('throws when the code-changes file is missing required fields', () => {
    fs.writeFileSync(codeChangesPath, JSON.stringify({ mergeBase: 'abc' })); // invalid
    setFlags({
      codeChanges: codeChangesPath,
      scopeOutput: scopeOutputPath,
      selectiveTesting: true,
    });

    expect(() => runResolveTestingScope(flagsReader, log)).toThrow(/code-changes file/i);
  });
});
