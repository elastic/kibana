/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SomeDevLog } from '@kbn/some-dev-log';
import { RepoPath } from '@kbn/repo-path';

import { LintTarget, PackageLintTarget, TsProjectLintTarget } from './lint_target';
import { RuleContext } from './rule_context';

export interface NamedViolation extends Violation {
  name: string;
}

export interface Violation {
  msg: string;
  fixes?: Record<string, (source: string) => string>;
}

export type CheckFn<T extends LintTarget> = (
  this: RuleContext,
  project: T
) => void | Violation[] | Violation | string | Promise<void | Violation[] | Violation | string>;

export abstract class Rule<T extends LintTarget> {
  protected constructor(public readonly name: string, private readonly fn: CheckFn<T>) {}

  async check(
    target: T,
    ruleCache: Map<Rule<any>, unknown>,
    allFiles: Iterable<RepoPath>,
    log: SomeDevLog,
    fileCache: Map<string, string>
  ) {
    const failures: NamedViolation[] = [];

    const ctx = new RuleContext(failures, target.dir, this, ruleCache, allFiles, log, fileCache);
    const extraFailures = (await this.fn.call(ctx, target)) ?? [];

    for (const failure of Array.isArray(extraFailures) ? extraFailures : [extraFailures]) {
      if (typeof failure === 'string') {
        failures.push({
          name: this.name,
          msg: failure,
        });
      } else {
        failures.push({
          name: this.name,
          ...failure,
        });
      }
    }

    return failures;
  }
}

export class PackageRule extends Rule<PackageLintTarget> {
  static create(name: string, options: { check: CheckFn<PackageLintTarget> }) {
    return new PackageRule(name, options.check);
  }
}

export class TsProjectRule extends Rule<TsProjectLintTarget> {
  static create(name: string, options: { check: CheckFn<TsProjectLintTarget> }) {
    return new TsProjectRule(name, options.check);
  }
}
