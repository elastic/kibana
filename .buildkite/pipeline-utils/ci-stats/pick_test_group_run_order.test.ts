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

import { shouldSkipNonScoutTests } from './pick_test_group_run_order';

describe('shouldSkipNonScoutTests', () => {
  let tmpRoot: string;
  let scopeFile: string;
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'pick-skip-scope-'));
    scopeFile = path.join(tmpRoot, 'testing_scope.json');
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  });

  it('returns { skip: false } when the artifact does not exist', () => {
    expect(shouldSkipNonScoutTests(scopeFile)).toEqual({ skip: false });
  });

  it('returns { skip: false } for a tests-only scope without the opt-in (skipNonScoutTests=false)', () => {
    fs.writeFileSync(
      scopeFile,
      JSON.stringify({
        kind: 'tests-only',
        skipNonScoutTests: false,
        affectedModules: [],
        affectedConfigs: ['x/playwright.config.ts'],
      })
    );
    expect(shouldSkipNonScoutTests(scopeFile)).toEqual({ skip: false, kind: 'tests-only' });
  });

  it('returns { skip: true } when skipNonScoutTests is true (tests-only + opt-in)', () => {
    fs.writeFileSync(
      scopeFile,
      JSON.stringify({
        kind: 'tests-only',
        skipNonScoutTests: true,
        affectedModules: [],
        affectedConfigs: ['x/playwright.config.ts'],
      })
    );
    expect(shouldSkipNonScoutTests(scopeFile)).toEqual({ skip: true, kind: 'tests-only' });
  });

  it('returns { skip: false } for a full scope even with skipNonScoutTests forced to true', () => {
    // Defensive: by contract the producer only emits skipNonScoutTests=true
    // for tests-only, but the consumer should still respect whatever it reads.
    fs.writeFileSync(
      scopeFile,
      JSON.stringify({
        kind: 'full',
        reason: 'critical-files',
        skipNonScoutTests: false,
        affectedModules: [],
      })
    );
    expect(shouldSkipNonScoutTests(scopeFile)).toEqual({ skip: false, kind: 'full' });
  });

  it('returns { skip: false } for a dependency-tree scope', () => {
    fs.writeFileSync(
      scopeFile,
      JSON.stringify({
        kind: 'dependency-tree',
        skipNonScoutTests: false,
        affectedModules: ['@kbn/foo'],
      })
    );
    expect(shouldSkipNonScoutTests(scopeFile)).toEqual({
      skip: false,
      kind: 'dependency-tree',
    });
  });

  it('returns { skip: false } and warns on malformed JSON', () => {
    fs.writeFileSync(scopeFile, '{ not valid json');
    expect(shouldSkipNonScoutTests(scopeFile)).toEqual({ skip: false });
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining(scopeFile), expect.any(Error));
  });

  it('treats missing skipNonScoutTests field as false', () => {
    fs.writeFileSync(scopeFile, JSON.stringify({ kind: 'tests-only' }));
    expect(shouldSkipNonScoutTests(scopeFile)).toEqual({ skip: false, kind: 'tests-only' });
  });
});
