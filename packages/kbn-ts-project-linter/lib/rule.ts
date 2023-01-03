/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Project } from '@kbn/ts-projects';

import { ProjectFileMap } from './project_file_map';
import { RuleContext } from './rule_context';

export interface NamedViolation extends Violation {
  name: string;
}

export interface Violation {
  msg: string;
  fix?(source: string): string;
}

export type CheckFn = (
  this: RuleContext,
  project: Project
) => void | Violation[] | Violation | string | Promise<void | Violation[] | Violation | string>;

export class Rule {
  static create(name: string, options: { check: CheckFn }) {
    return new Rule(name, options.check);
  }

  private constructor(public readonly name: string, private readonly fn: CheckFn) {}

  async check(project: Project, ruleCache: Map<Rule, unknown>, projectFileMap: ProjectFileMap) {
    const failures: NamedViolation[] = [];

    const ctx = new RuleContext(failures, project, this, ruleCache, projectFileMap);
    const extraFailures = (await this.fn.call(ctx, project)) ?? [];

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
