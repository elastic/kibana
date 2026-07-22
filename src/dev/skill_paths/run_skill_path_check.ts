/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { readFileSync } from 'fs';
import * as path from 'path';

import { classifyToken, extractPaths } from './extract_paths';
import { resolveAndCheck } from './resolve_and_check';

export interface SkillPathFinding {
  /** Repo-relative path of the skill file containing the broken reference. */
  file: string;
  /** 1-indexed line number of the token within that file. */
  line: number;
  /** The path token as it appears in the source (fragment already stripped for links). */
  token: string;
  /** The absolute path that was checked and found to be missing. */
  resolvedPath: string;
}

export interface SkillPathResult {
  /** Tokens that resolved to a path that does not exist on disk. */
  findings: SkillPathFinding[];
  /** Number of tokens that were validated (not skipped). */
  checked: number;
  /** Number of tokens that were skipped (not validated). */
  skipped: number;
}

/**
 * Scan a list of skill Markdown files for path tokens that no longer exist.
 *
 * @param skillFiles - Absolute paths to the Markdown files to check.
 * @param repoRoot   - Absolute path to the repository root.
 */
export async function runSkillPathCheck(
  skillFiles: string[],
  repoRoot: string
): Promise<SkillPathResult> {
  const findings: SkillPathFinding[] = [];
  let checked = 0;
  let skipped = 0;

  for (const absPath of skillFiles) {
    const content = readFileSync(absPath, 'utf8');
    const tokens = extractPaths(content);

    for (const { line, token, tokenKind, rawLine } of tokens) {
      const classification = classifyToken(token, tokenKind, rawLine, content);

      if (classification.kind === 'skip') {
        skipped++;
        continue;
      }

      // classification.kind === 'validate'
      checked++;
      const { anchor, token: resolvedToken, declaredBase } = classification;
      const { exists, resolvedPath } = resolveAndCheck({
        token: resolvedToken,
        anchor,
        containingFile: absPath,
        repoRoot,
        declaredBase,
      });

      if (!exists) {
        const repoRelFile = path.relative(repoRoot, absPath);
        findings.push({ file: repoRelFile, line, token: resolvedToken, resolvedPath });
      }
    }
  }

  return { findings, checked, skipped };
}
