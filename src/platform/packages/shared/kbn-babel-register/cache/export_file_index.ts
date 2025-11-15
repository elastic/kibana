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
import Os from 'os';
import { execSync } from 'child_process';
import type { RootDatabase } from 'lmdb';
import type { RunOptions } from '@kbn/dev-cli-runner';
import { run } from '@kbn/dev-cli-runner';
import type { ToolingLog } from '@kbn/tooling-log';

import { open as lmdbOpen } from 'lmdb';
import { REPO_ROOT } from '@kbn/repo-info';
import type { CacheEntry } from './types';

interface FileIndex {
  files: string[];
  byBasename: Record<string, string[]>;
  functionToFiles: Record<string, string[]>;
  generatedAt: string;
  branch: string;
}

const runOptions: RunOptions = {
  description: 'Export a file index from LMDB babel-register cache',
  log: {
    context: 'export-lmdb-file-index',
    defaultLevel: 'info',
  },
};

/**
 * Export a file index from LMDB babel-register cache
 *
 * This reads the LMDB cache (v6+) which stores file paths directly,
 * making it much simpler and more accurate than scanning the workspace.
 */
export function exportFileIndex(): void {
  void run(async ({ log }) => {
    await exportFileIndexWithLog(log);
  }, runOptions);
}

async function exportFileIndexWithLog(log: ToolingLog): Promise<void> {
  const dataDir = Path.join(REPO_ROOT, 'data', 'babel_register_cache', 'main');
  const dbPath = Path.join(dataDir, 'v6');

  log.info(`Reading LMDB database from: ${dbPath}`);

  if (!Fs.existsSync(dbPath)) {
    log.error(`LMDB database not found at ${dbPath}`);
    log.error('The cache may not have been populated yet. Try starting Kibana first.');
    process.exit(1);
  }

  const db: RootDatabase<CacheEntry, string> = lmdbOpen({
    path: dbPath,
    name: 'db',
    encoding: 'json',
    readOnly: true,
    noSubdir: false,
  });

  const fileIndex: FileIndex = {
    files: [],
    byBasename: {},
    functionToFiles: {},
    generatedAt: new Date().toISOString(),
    branch: getGitBranch(),
  };

  const seenFiles = new Set<string>();
  let entriesProcessed = 0;
  let functionsExtracted = 0;
  let filesAttempted = 0;
  let filesFailed = 0;

  // Regex patterns to match function/class/interface declarations
  const functionPatterns: RegExp[] = [
    /^\s*(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(/gm,
    /^\s*(?:export\s+)?(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?\(/gm,
    /^\s*(?:export\s+)?(?:abstract\s+)?class\s+(\w+)/gm,
    /^\s*(?:export\s+)?interface\s+(\w+)/gm,
    /^\s*(?:export\s+)?type\s+(\w+)\s*=/gm,
    /^\s*(?:public|private|protected|static|async)[\s]+(\w+)\s*\(/gm,
    /^\s*(?:async\s+)?(\w+)\s*\(/gm,
  ];

  for (const { key, value } of db.getRange()) {
    if (key === '@last clean') {
      continue;
    }

    entriesProcessed++;

    // value is [atime, path, code, sourceMap]
    const filePath = value[1];
    const sourceMap = value[3];

    // Skip entries without a file path
    if (!filePath || typeof filePath !== 'string') {
      continue;
    }

    // Skip if already seen
    if (seenFiles.has(filePath)) {
      continue;
    }

    // Verify the file actually exists
    filesAttempted++;
    let fileExists = false;
    try {
      const stats = Fs.statSync(filePath);
      fileExists = stats.isFile();
    } catch (error) {
      // File doesn't exist, skip it
      filesFailed++;
      if (filesFailed <= 5) {
        log.debug(`File not found (${filesFailed}): ${filePath}`);
      }
      continue;
    }

    if (!fileExists) {
      continue;
    }

    // Add to file lists
    seenFiles.add(filePath);
    fileIndex.files.push(filePath);

    const basename = Path.basename(filePath);
    if (!fileIndex.byBasename[basename]) {
      fileIndex.byBasename[basename] = [];
    }
    fileIndex.byBasename[basename].push(filePath);

    // Extract functions from source map if available
    if (sourceMap && typeof sourceMap === 'object' && 'sourcesContent' in sourceMap) {
      const sourcesContent = (sourceMap as any).sourcesContent;
      if (Array.isArray(sourcesContent)) {
        for (const sourceContent of sourcesContent) {
          if (sourceContent && typeof sourceContent === 'string') {
            const functions = extractFunctions(sourceContent, functionPatterns);

            for (const funcName of functions) {
              // Skip invalid function names
              if (!funcName || typeof funcName !== 'string') {
                continue;
              }

              // Initialize array if it doesn't exist
              if (!Array.isArray(fileIndex.functionToFiles[funcName])) {
                fileIndex.functionToFiles[funcName] = [];
              }

              // Add file to function mapping if not already present
              if (!fileIndex.functionToFiles[funcName].includes(filePath)) {
                fileIndex.functionToFiles[funcName].push(filePath);
                functionsExtracted++;
              }
            }
          }
        }
      }
    }
  }

  log.write('');
  log.info(`Processed ${entriesProcessed} LMDB entries`);
  log.info(`Attempted to verify ${filesAttempted} files`);
  log.info(`Failed verification: ${filesFailed} files`);
  log.info(`Found ${fileIndex.files.length} unique source files`);
  log.info(`Extracted ${functionsExtracted} function mappings`);
  log.info(`Found ${Object.keys(fileIndex.functionToFiles).length} unique function names`);

  // Write to temp directory (same location as profiles)
  const outputDir = Path.join(Os.tmpdir(), 'kbn-profiler-cli-profiles');
  const outputPath = Path.join(outputDir, 'file-index.json');

  if (!Fs.existsSync(outputDir)) {
    Fs.mkdirSync(outputDir, { recursive: true });
  }

  Fs.writeFileSync(outputPath, JSON.stringify(fileIndex, null, 2));
  log.write('');
  log.success(`Exported file index to: ${outputPath}`);
  log.info(`Index contains ${fileIndex.files.length} files`);
  log.info(`Index contains ${Object.keys(fileIndex.byBasename).length} unique basenames`);
  log.info(`Index contains ${Object.keys(fileIndex.functionToFiles).length} function names`);

  db.close();
}

function extractFunctions(sourceCode: string, patterns: RegExp[]): string[] {
  const functions = new Set<string>();

  for (const pattern of patterns) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(sourceCode)) !== null) {
      const funcName = match[1];
      if (funcName && funcName !== 'function' && funcName !== 'async') {
        functions.add(funcName);
      }
    }
  }

  return Array.from(functions);
}

function getGitBranch(): string {
  try {
    return execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
  } catch (error) {
    return 'unknown';
  }
}
