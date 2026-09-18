/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import path from 'node:path';
import ignore from 'ignore';
import { REPO_ROOT } from '@kbn/repo-info';
import type { CodeOwnersEntry } from './code_owners';
import { findCodeOwnersEntryForPath, getOwningTeamsForPath } from './code_owners';
import { getRepoRelativePath, throwIfPathNotInRepo } from './path';

const createEntry = (pattern: string, teams: string[]): CodeOwnersEntry => ({
  pattern,
  teams,
  areas: [],
  matcher: ignore().add(pattern),
});

// Mirrors the CODEOWNERS layout of a Cypress project: a catch-all `/*` entry for the project root
// owned by one team, with sub-directories owned by other teams. Entries are in reverse order of
// definition, as returned by `getCodeOwnersEntries`.
const PROJECT_ROOT = 'x-pack/solutions/security/test/security_solution_cypress';
const SPEC_DIR = `${PROJECT_ROOT}/cypress/e2e/detection_response/detection_engine`;
const SPEC_FILE = `${SPEC_DIR}/alert_suppression/custom_query_rule.cy.ts`;
const CONFIG_FILE = `${PROJECT_ROOT}/cypress/cypress_ci.config.ts`;

const entries: CodeOwnersEntry[] = [
  createEntry(`/${SPEC_DIR}`, ['elastic/security-detection-engineering']),
  createEntry(`/${PROJECT_ROOT}/cypress/*`, ['elastic/security-engineering-productivity']),
  createEntry(`/${PROJECT_ROOT}/*`, ['elastic/security-engineering-productivity']),
];

describe('code owners path lookup', () => {
  const originalCwd = process.cwd();

  afterEach(() => {
    process.chdir(originalCwd);
  });

  describe('getRepoRelativePath', () => {
    it('makes absolute paths relative to the repo root', () => {
      expect(getRepoRelativePath(path.join(REPO_ROOT, SPEC_FILE))).toBe(SPEC_FILE);
    });

    it('treats relative paths as repo-relative regardless of cwd', () => {
      process.chdir(path.join(REPO_ROOT, PROJECT_ROOT));
      expect(getRepoRelativePath(SPEC_FILE)).toBe(SPEC_FILE);
    });

    it('normalizes relative paths', () => {
      expect(getRepoRelativePath(`./${PROJECT_ROOT}/cypress/../cypress/cypress_ci.config.ts`)).toBe(
        CONFIG_FILE
      );
    });
  });

  describe('throwIfPathNotInRepo', () => {
    it('accepts absolute and repo-relative paths inside the repo', () => {
      expect(() => throwIfPathNotInRepo(path.join(REPO_ROOT, SPEC_FILE))).not.toThrow();
      expect(() => throwIfPathNotInRepo(SPEC_FILE)).not.toThrow();
    });

    it('rejects paths that escape the repo root', () => {
      expect(() => throwIfPathNotInRepo(path.resolve(REPO_ROOT, '..'))).toThrow(
        /not part of this repository/
      );
      expect(() => throwIfPathNotInRepo(path.resolve(REPO_ROOT, '../other-repo/file.ts'))).toThrow(
        /not part of this repository/
      );
      expect(() => throwIfPathNotInRepo('../other-repo/file.ts')).toThrow(
        /not part of this repository/
      );
    });
  });

  describe('findCodeOwnersEntryForPath', () => {
    it('resolves the most specific entry for an absolute path', () => {
      const entry = findCodeOwnersEntryForPath(path.join(REPO_ROOT, SPEC_FILE), entries);
      expect(entry?.teams).toEqual(['elastic/security-detection-engineering']);
    });

    it('resolves the most specific entry for a repo-relative path', () => {
      const entry = findCodeOwnersEntryForPath(SPEC_FILE, entries);
      expect(entry?.teams).toEqual(['elastic/security-detection-engineering']);
    });

    it('resolves the catch-all entry for files directly under the project root', () => {
      const entry = findCodeOwnersEntryForPath(CONFIG_FILE, entries);
      expect(entry?.pattern).toBe(`/${PROJECT_ROOT}/cypress/*`);
    });

    it('is not affected by the current working directory', () => {
      // Cypress runs its reporters with the project directory as cwd. Resolving a repo-relative
      // path against that cwd would produce a doubled path that falls through to the catch-all entry.
      process.chdir(path.join(REPO_ROOT, PROJECT_ROOT));

      expect(getOwningTeamsForPath(SPEC_FILE, entries)).toEqual([
        'elastic/security-detection-engineering',
      ]);
      expect(getOwningTeamsForPath(path.join(REPO_ROOT, SPEC_FILE), entries)).toEqual([
        'elastic/security-detection-engineering',
      ]);
    });

    it('returns undefined when no entry matches', () => {
      expect(findCodeOwnersEntryForPath('src/some/unowned/file.ts', entries)).toBeUndefined();
      expect(getOwningTeamsForPath('src/some/unowned/file.ts', entries)).toEqual([]);
    });
  });
});
