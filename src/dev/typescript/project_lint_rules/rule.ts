/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Project } from '../project';
import type { LintOptions } from '../lint_projects';

export interface NamedViolation extends Violation {
  name: string;
}

interface Violation {
  msg: string;
  fix?(source: string): string;
}

type CheckFn = (
  this: RuleContext,
  project: Project,
  jsonc: string,
  options: LintOptions
) => void | Violation[] | Violation | string;

interface RuleContext {
  err(msg: string, fix?: (jsonc: string) => string): void;
}

export class Rule {
  static create(name: string, options: { check: CheckFn }) {
    return new Rule(name, options.check);
  }

  public readonly failures: Violation[] = [];

  private constructor(private readonly name: string, private readonly fn: CheckFn) {}

  check(project: Project, jsonc: string, options: LintOptions) {
    const failures: NamedViolation[] = [];

    const ctx: RuleContext = {
      err: (msg: string, fix?: (source: string) => string) => {
        failures.push({
          name: this.name,
          msg,
          fix,
        });
      },
    };

    const extraFailures = this.fn.call(ctx, project, jsonc, options) ?? [];
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
