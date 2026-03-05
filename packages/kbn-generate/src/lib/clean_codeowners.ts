/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Fs from 'fs';
import Path from 'path';

/**
 * Get the path (first token) from a CODEOWNERS line, or null if this line
 * is not an ownership rule (comment, blank, negation, or invalid).
 */
function getPathFromLine(line: string): string | null {
  const trimmed = line.trim();
  const isCommentOrBlank = !trimmed || trimmed.startsWith('#') || trimmed.startsWith('!');
  if (isCommentOrBlank) return null;

  const pathToken = trimmed.split(/\s+/)[0];
  const looksLikePath = pathToken && (pathToken.startsWith('/') || pathToken.includes('/'));
  if (!looksLikePath) return null;

  return pathToken;
}

/**
 * Convert a CODEOWNERS path (e.g. "/src/cli" or "packages/foo") to an absolute
 * filesystem path under repo root.
 */
function toAbsolutePath(ownerPath: string, repoRoot: string): string {
  const withoutLeadingSlash = ownerPath.startsWith('/') ? ownerPath.slice(1) : ownerPath;
  return Path.join(repoRoot, withoutLeadingSlash);
}

/**
 * For a path that contains no glob: check that the file or directory exists.
 */
function existsLiteral(absolutePath: string): boolean {
  return Fs.existsSync(absolutePath);
}

/**
 * For a path that contains * or **: we only check that the parent directory
 * of the glob segment exists (we don't expand the glob).
 * E.g. "packages/kbn-asterisk/" -> check that "packages" exists.
 */
function existsGlob(ownerPath: string, repoRoot: string): boolean {
  const withoutLeadingSlash = ownerPath.startsWith('/') ? ownerPath.slice(1) : ownerPath;
  const upToFirstStar = withoutLeadingSlash.replace(/\*.*$/, '').replace(/\/+$/, '');
  const parentDir = upToFirstStar.includes('/')
    ? upToFirstStar.replace(/\/[^/]*$/, '')
    : upToFirstStar || '.';
  const absoluteParent = Path.join(repoRoot, parentDir);
  return Fs.existsSync(absoluteParent);
}

/**
 * Return true if the CODEOWNERS path exists in the repo (file, dir, or parent of glob).
 */
function pathExistsInRepo(ownerPath: string, repoRoot: string): boolean {
  const hasGlob = ownerPath.includes('*');
  if (hasGlob) {
    return existsGlob(ownerPath, repoRoot);
  }
  return existsLiteral(toAbsolutePath(ownerPath, repoRoot));
}

/**
 * Remove CODEOWNERS lines that are ownership rules whose path does not exist in the repo.
 * Only considers lines that look like path + owners; comments and blank lines are kept.
 * Used to clean the non-generated overrides section.
 *
 * @param sectionContent - Raw section text (e.g. the overrides section)
 * @param repoRoot - Repo root for resolving paths
 * @returns Cleaned section and list of removed entries (1-based line number within section + line text)
 */
export function cleanNonGeneratedSection(
  sectionContent: string,
  repoRoot: string
): { cleaned: string; removed: Array<{ lineNumber: number; line: string }> } {
  const lines = sectionContent.split('\n');
  const kept: string[] = [];
  const removed: Array<{ lineNumber: number; line: string }> = [];

  lines.forEach((line, index) => {
    const ownerPath = getPathFromLine(line);
    if (ownerPath === null) {
      kept.push(line);
      return;
    }
    if (pathExistsInRepo(ownerPath, repoRoot)) {
      kept.push(line);
    } else {
      removed.push({ lineNumber: index + 1, line });
    }
  });

  const cleaned = kept.join('\n') + (sectionContent.endsWith('\n') ? '\n' : '');
  return { cleaned, removed };
}
