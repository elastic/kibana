/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { execFile } from 'child_process';
import { promisify } from 'util';
import { REPO_ROOT } from '@kbn/repo-info';
import type { ToolingLog } from '@kbn/tooling-log';

const execFileAsync = promisify(execFile);

/**
 * Find files that import any of the given files
 */
export async function findDependentFiles(files: string[], log: ToolingLog): Promise<string[]> {
  const dependents = new Set<string>();
  const originalFiles = new Set(files);

  // Filter to only JS/TS files
  const jsFiles = files.filter((f) => /\.(ts|tsx|js|jsx)$/.test(f));

  if (jsFiles.length === 0) {
    return [];
  }

  log.info(`Scanning imports for ${jsFiles.length} file(s)...`);

  // Collect all patterns from all files
  const allPatterns: string[] = [];
  for (const file of jsFiles) {
    allPatterns.push(...getImportPatterns(file));
  }

  // Deduplicate patterns
  const uniquePatterns = [...new Set(allPatterns)];
  log.info(`Generated ${uniquePatterns.length} unique import patterns`);

  // Batch patterns into groups to avoid command line length limits
  const BATCH_SIZE = 50;
  const batches: string[][] = [];
  for (let i = 0; i < uniquePatterns.length; i += BATCH_SIZE) {
    batches.push(uniquePatterns.slice(i, i + BATCH_SIZE));
  }

  log.info(`Running ${batches.length} batched git grep search(es)...`);

  // Run batches in parallel (limit concurrency to avoid overwhelming git)
  const CONCURRENCY = 4;

  for (let i = 0; i < batches.length; i += CONCURRENCY) {
    const batchGroup = batches.slice(i, i + CONCURRENCY);
    const progress = `[${Math.min(i + CONCURRENCY, batches.length)}/${batches.length}]`;

    const results = await Promise.all(
      batchGroup.map(async (patterns) => {
        try {
          // Build git grep args with multiple -e patterns
          const args = ['grep', '-l', '--extended-regexp'];

          for (const pattern of patterns) {
            args.push('-e', pattern);
          }

          args.push('--', '*.ts', '*.tsx', '*.js', '*.jsx');

          const { stdout } = await execFileAsync('git', args, {
            cwd: REPO_ROOT,
            maxBuffer: 10 * 1024 * 1024,
          });

          return stdout.trim().split('\n').filter(Boolean);
        } catch {
          // git grep returns exit code 1 when no matches found
          return [];
        }
      })
    );

    // Collect results
    for (const matches of results) {
      for (const match of matches) {
        // Don't add original files as their own dependents
        if (!originalFiles.has(match)) {
          dependents.add(match);
        }
      }
    }

    log.info(`${progress} Found ${dependents.size} dependent file(s) so far`);
  }

  return Array.from(dependents);
}

/**
 * Generate possible import patterns for a file
 */
export function getImportPatterns(filePath: string): string[] {
  const patterns: string[] = [];

  // Remove file extension
  const withoutExt = filePath.replace(/\.(ts|tsx|js|jsx)$/, '');

  // Get the filename without directory
  const filename = withoutExt.split('/').pop() || withoutExt;

  // Get package-relative paths (for files in packages)
  const packageMatch = filePath.match(
    /(?:packages|src\/platform\/packages\/(?:shared|private))\/([^/]+)/
  );

  if (packageMatch) {
    // Extract the part after the package directory
    const afterPackage = withoutExt.split(packageMatch[0])[1] || '';
    if (afterPackage) {
      // Pattern for package imports like '@kbn/package-name/path'
      patterns.push(`from ['"]@kbn/[^'"]*${afterPackage.replace(/^\/src/, '')}['"]`);
    }
  }

  // Pattern for relative imports using the filename
  if (filename !== 'index') {
    patterns.push(`from ['"][^'"]*/${filename}['"]`);
  }

  // Pattern for the full relative path (last 2-3 segments)
  const segments = withoutExt.split('/');
  if (segments.length >= 2) {
    const lastTwo = segments.slice(-2).join('/');
    patterns.push(`from ['"][^'"]*${lastTwo}['"]`);
  }

  return patterns;
}
