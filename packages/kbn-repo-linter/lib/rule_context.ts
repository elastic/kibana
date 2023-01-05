/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';

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
    public readonly log: SomeDevLog
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
}
