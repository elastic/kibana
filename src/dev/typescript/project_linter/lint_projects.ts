/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Fs from 'fs';
import Path from 'path';

import { SomeDevLog } from '@kbn/some-dev-log';

import { LintProject } from './lib/lint_project';
import { Rule, NamedViolation } from './lib/rule';
import { PROJECT_LINTER_RULES } from './rules';

export interface LintOptions {
  fix: boolean;
  pkgMap: Map<string, string>;
  pkgDirMap: Map<string, string>;
}

export function getLintedProjects(log: SomeDevLog, options: LintOptions) {
  let errorCount = 0;
  let fixedCount = 0;
  const projects = LintProject.getAll();
  const ruleCache = new Map<Rule, unknown>();

  for (const project of projects) {
    const unfixedJsonc = Fs.readFileSync(project.path, 'utf8');
    const unfixedErrors: NamedViolation[] = [];
    let fixedJsonc = unfixedJsonc;

    for (const rule of PROJECT_LINTER_RULES) {
      const errors = rule.check(project, fixedJsonc, ruleCache);
      for (const error of errors) {
        if (!error.fix || !options.fix) {
          unfixedErrors.push(error);
          continue;
        }

        let update;
        try {
          update = error.fix(fixedJsonc);
        } catch (e) {
          log.debug(`error fixing project:`, e);
        }

        if (update !== undefined && update !== fixedJsonc) {
          fixedJsonc = update;
        } else {
          unfixedErrors.push(error);
        }
      }
    }

    if (fixedJsonc !== unfixedJsonc) {
      Fs.writeFileSync(project.path, fixedJsonc, 'utf8');
      project.refreshTsConfig();
      log.debug('fixed', project.path);
      fixedCount += 1;
    }

    if (unfixedErrors.length) {
      let msg = `Lint errors in ${Path.relative(process.cwd(), project.path)}:\n`;
      for (const error of unfixedErrors) {
        msg += ` [${error.name}]: ${error.msg}\n`;
      }
      errorCount += 1;
      log.error(msg);
    }
  }

  if (fixedCount) {
    log.success(`Applied ${fixedCount} fixes to projects`);
  }

  if (errorCount) {
    if (options.fix) {
      log.error(`Found ${errorCount} un-fixable errors when linting projects.`);
    } else {
      log.error(
        `Found ${errorCount} errors when linting projects. Pass --fix to try auto-fixing them.`
      );
    }
  } else {
    log.success('All TS projects linted successfully');
  }

  return {
    projects: projects.map(LintProject.getKbnTsProject),
    lintingErrorCount: errorCount,
  };
}
