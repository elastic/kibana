/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as path from 'path';
import { resolveAndCheck } from './resolve_and_check';

// The worktree root serves as repoRoot for these tests.
// It shares the same file tree as the main Kibana repo.
const REPO_ROOT = path.resolve(__dirname, '../../../');

// Absolute path to a real skill file used for markdown-link anchor tests.
const SKILL_FILE = path.join(
  REPO_ROOT,
  'x-pack/solutions/security/plugins/security_solution/.agents/skills/cypress-to-scout-migration/SKILL.md'
);

describe('resolveAndCheck', () => {
  it('resolves a repo-root path that exists (scripts/scout.js)', () => {
    const result = resolveAndCheck({
      token: 'scripts/scout.js',
      anchor: 'repo-root',
      containingFile: SKILL_FILE,
      repoRoot: REPO_ROOT,
    });
    expect(result.exists).toBe(true);
    expect(result.resolvedPath).toBe(path.resolve(REPO_ROOT, 'scripts/scout.js'));
  });

  it('resolves a repo-root path that exists (src/dev/run_check_file_casing.ts)', () => {
    const result = resolveAndCheck({
      token: 'src/dev/run_check_file_casing.ts',
      anchor: 'repo-root',
      containingFile: SKILL_FILE,
      repoRoot: REPO_ROOT,
    });
    expect(result.exists).toBe(true);
    expect(result.resolvedPath).toBe(path.resolve(REPO_ROOT, 'src/dev/run_check_file_casing.ts'));
  });

  it('resolves a repo-root path that does NOT exist', () => {
    const result = resolveAndCheck({
      token: 'scripts/scout_NONEXISTENT_9999.js',
      anchor: 'repo-root',
      containingFile: SKILL_FILE,
      repoRoot: REPO_ROOT,
    });
    expect(result.exists).toBe(false);
    expect(result.resolvedPath).toBe(path.resolve(REPO_ROOT, 'scripts/scout_NONEXISTENT_9999.js'));
  });

  it('resolves a markdown-link token relative to the containing file directory', () => {
    // SKILL_FILE is in .../cypress-to-scout-migration/
    // assets/page_object_template.md exists in that same directory
    const result = resolveAndCheck({
      token: 'assets/page_object_template.md',
      anchor: 'file',
      containingFile: SKILL_FILE,
      repoRoot: REPO_ROOT,
    });
    expect(result.exists).toBe(true);
    expect(result.resolvedPath).toBe(
      path.resolve(path.dirname(SKILL_FILE), 'assets/page_object_template.md')
    );
  });

  it('resolves a declared-base token under x-pack/solutions/security', () => {
    const result = resolveAndCheck({
      token: 'plugins/security_solution/',
      anchor: 'declared-base',
      containingFile: SKILL_FILE,
      repoRoot: REPO_ROOT,
      declaredBase: 'x-pack/solutions/security',
    });
    expect(result.exists).toBe(true);
    expect(result.resolvedPath).toBe(
      path.resolve(REPO_ROOT, 'x-pack/solutions/security', 'plugins/security_solution/')
    );
  });
});
