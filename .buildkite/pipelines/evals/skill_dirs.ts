/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { execFileSync } from 'node:child_process';
import { basename, dirname } from 'node:path';

const SKILL_FILE_NAME = 'SKILL.md';

// The skill loader ignores dot-prefixed files and directories, and `.claude/` or `.agents/` trees
// hold developer tooling that is never registered at runtime.
export const hasDotSegment = (path: string): boolean =>
  path.split('/').some((segment) => segment.startsWith('.'));

/**
 * The runtime skill directories among `trackedFiles`: the directory of every `SKILL.md`. The skill
 * loader reads that file and every other `.md` beneath its directory as runtime content.
 */
export const toSkillDirs = (trackedFiles: readonly string[]): string[] => [
  ...new Set(
    trackedFiles
      .filter((file) => basename(file) === SKILL_FILE_NAME && !hasDotSegment(file))
      .map((file) => dirname(file))
  ),
];

/** Skill directories in the current checkout. Run from the repository root. */
export const listSkillDirs = (): string[] =>
  toSkillDirs(
    execFileSync('git', ['ls-files', '-z', '--', `*${SKILL_FILE_NAME}`], {
      encoding: 'utf-8',
      maxBuffer: 64 * 1024 * 1024,
    })
      .split('\0')
      .filter(Boolean)
  );
