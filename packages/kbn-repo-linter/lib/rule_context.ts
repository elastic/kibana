/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';
import Fs from 'fs';

import { SomeDevLog } from '@kbn/some-dev-log';
import { RepoPath } from '@kbn/repo-path';

import { NamedViolation, Rule } from './rule';

export class RuleContext {
  constructor(
    private readonly failures: NamedViolation[],
    private readonly directory: string,
    private readonly rule: Rule<any>,
    private readonly ruleCache: Map<Rule<any>, unknown>,
    private readonly allFiles: Iterable<RepoPath>,
    public readonly log: SomeDevLog,
    private readonly fileCache: Map<string, string>
  ) {}

  getCache<T>(init: () => T) {
    const cached = this.ruleCache.get(this.rule) as T | undefined;
    if (cached !== undefined) {
      return cached;
    }

    const value = init();
    this.ruleCache.set(this.rule, value);
    return value;
  }

  /**
   * Report an error with an optional fix for that erro
   */
  err(msg: string, fixes?: { [filename: string]: (source: string) => string }) {
    this.failures.push({
      name: this.rule.name,
      msg,
      fixes,
    });
  }

  /**
   * Resolve a path relative to the directory of the current project being linted
   */
  resolve(rel: string) {
    return Path.resolve(this.directory, rel);
  }

  getAllFiles() {
    return Array.from(this.allFiles);
  }

  /**
   * Get the contents of the file at the relative path (relative to root of package/ts project)
   */
  get(rel: string) {
    const cached = this.fileCache.get(rel);
    if (cached) {
      return cached;
    }

    const content = Fs.readFileSync(this.resolve(rel), 'utf8');
    this.fileCache.set(rel, content);
    return content;
  }
}
