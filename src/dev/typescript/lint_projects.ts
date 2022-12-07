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
import { setTimeout } from 'timers/promises';

import { PROJECTS } from './projects';
import { Project } from './project';
import { NamedViolation } from './project_lint_rules/rule';
import { PROJECT_LINT_RULES } from './project_lint_rules';

export interface LintOptions {
  fix: boolean;
  pkgMap: Map<string, string>;
  pkgDirMap: Map<string, string>;
}

export async function getLintedProjects(log: SomeDevLog, options: LintOptions) {
  let projects: Project[] | undefined;
  let errorCount = 0;
  let fixedCount = 0;
  const fsCache = new Map<string, string>();
  const linted = new Set<string>();

  lintProjects: while (!projects || projects.length > linted.size) {
    // pause, in case there are a lot of updates give a moment for the process to be aborted
    await setTimeout(0);
    projects = projects ? Project.reload(projects, fsCache) : Array.from(PROJECTS);

    for (const project of projects) {
      if (linted.has(project.tsConfigPath)) {
        continue;
      }

      const unfixedJsonc = Fs.readFileSync(project.tsConfigPath, 'utf8');
      const unfixedErrors: NamedViolation[] = [];
      let fixedJsonc = unfixedJsonc;

      for (const rule of PROJECT_LINT_RULES) {
        const errors = rule.check(project, fixedJsonc, options);
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
        Fs.writeFileSync(project.tsConfigPath, fixedJsonc, 'utf8');
        fsCache.delete(project.tsConfigPath);
        log.debug('fixed', project.tsConfigPath, 'reloading');
        fixedCount += 1;
        continue lintProjects;
      }

      linted.add(project.tsConfigPath);
      if (unfixedErrors.length) {
        let msg = `Lint errors in ${Path.relative(process.cwd(), project.tsConfigPath)}:\n`;
        for (const error of unfixedErrors) {
          msg += ` [${error.name}]: ${error.msg}\n`;
        }
        errorCount += 1;
        log.error(msg);
      }
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
    projects,
    lintingErrorCount: errorCount,
  };
}
