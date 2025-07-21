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
import { FileWalker } from '../file_walker';

function getChangedFileStatsFilename(directory: string): string {
  return Path.join(directory, 'changed-files.json');
}

/**
 * ChangeTracker is a tiny controller that:
 * - reads the changed-files manifest if its mtime changed
 * - asks FileWalker to invalidate caches for changed files and their dependents
 * - maintains a per-file version for external cache-key salting
 *
 * It does not compute graph state; it only coordinates invalidation and versioning.
 */
export class ChangeTracker {
  private lastMtime = new Map<string, number>();
  private versions = new Map<string, number>();

  constructor(private readonly fileWalker: FileWalker) {}

  static invalidateChangedFiles(cacheDirectory: string, changedFiles: string[]) {
    const filename = getChangedFileStatsFilename(cacheDirectory);
    Fs.writeFileSync(filename, JSON.stringify(changedFiles), 'utf8');
  }

  public ensureFresh(cacheDirectory: string) {
    const filename = getChangedFileStatsFilename(cacheDirectory);
    let changed: string[] = [];

    try {
      const stats = Fs.statSync(filename);
      const prevMtime = this.lastMtime.get(cacheDirectory) ?? 0;
      if (stats.mtimeMs === prevMtime) {
        return; // nothing to do
      }
      this.lastMtime.set(cacheDirectory, stats.mtimeMs);
      try {
        changed = JSON.parse(Fs.readFileSync(filename, 'utf8')) as string[];
      } catch {
        changed = [];
      }
    } catch {
      return; // no manifest yet
    }

    if (!changed.length) return;

    const filesToInvalidate = new Set<string>(changed);

    for (const file of changed) {
      this.fileWalker.getDependents(file).forEach((dependent) => {
        filesToInvalidate.add(dependent);
      });
    }

    for (const file of filesToInvalidate) {
      this.versions.set(file, (this.versions.get(file) ?? 0) + 1);
    }

    this.fileWalker.invalidateChangedFiles(Array.from(filesToInvalidate));
  }

  public getVersion(filePath: string): number {
    return this.versions.get(filePath) ?? 0;
  }
}
