/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Fs from 'fs';
import Path from 'path';

import { ToolingLog } from '@kbn/tooling-log';
import { Project } from '@kbn/ts-projects';

import { PROJECT_LINTER_RULES } from '../rules';
import { ProjectFileMap } from './project_file_map';
import { Rule, NamedViolation } from './rule';

export interface LintOptions {
  fix: boolean;
  projectFileMap: ProjectFileMap;
  skipRefs?: boolean;
}

export async function lintProjects(log: ToolingLog, projects: Project[], options: LintOptions) {
  let errorCount = 0;
  let fixedCount = 0;
  const ruleCache = new Map<Rule, unknown>();

  if (options.skipRefs) {
    log.warning('skipping [referenceUsedPkgs] rule');
  }

  for (const project of projects) {
    log.debug('starting to lint project:', project.name);
    const unfixedJsonc = Fs.readFileSync(project.path, 'utf8');
    const unfixedErrors: NamedViolation[] = [];
    let fixedJsonc = unfixedJsonc;

    await log.indent(4, async () => {
      let haveNewFixes = false;

      for (const rule of PROJECT_LINTER_RULES) {
        if (options.skipRefs && rule.name === 'referenceUsedPkgs') {
          continue;
        }

        if (haveNewFixes) {
          haveNewFixes = false;
          log.debug('overriding config with fixed config');
          project.overrideConfig(fixedJsonc);
        }

        log.debug('rule:', rule.name);
        await log.indent(4, async () => {
          const errors = await rule.check(project, ruleCache, options.projectFileMap);
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
              haveNewFixes = true;
            } else {
              unfixedErrors.push(error);
            }
          }
        });
      }
    });

    if (fixedJsonc !== unfixedJsonc) {
      Fs.writeFileSync(project.path, fixedJsonc, 'utf8');
      project.reloadFromDisk();
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
    lintingErrorCount: errorCount,
  };
}
