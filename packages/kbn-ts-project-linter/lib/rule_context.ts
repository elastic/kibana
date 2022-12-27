/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';

import { Project } from '@kbn/ts-projects';

import { ProjectFileMap } from './project_file_map';
import { NamedViolation, Rule } from './rule';

export class RuleContext {
  constructor(
    private readonly failures: NamedViolation[],
    private readonly project: Project,
    private readonly rule: Rule,
    private readonly ruleCache: Map<Rule, unknown>,
    private readonly projectFileMap: ProjectFileMap
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
  err(msg: string, fix?: (source: string) => string) {
    this.failures.push({
      name: this.rule.name,
      msg,
      fix,
    });
  }

  /**
   * Resolve a path relative to the directory of the current project being linted
   */
  resolve(rel: string) {
    return Path.resolve(this.project.directory, rel);
  }

  getAllFiles() {
    return this.projectFileMap.getFiles(this.project);
  }
}
