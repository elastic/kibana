/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Fs from 'fs';

import type { ToolingLog } from '@kbn/tooling-log';
import type { RepoPath } from '@kbn/repo-path';

import type { LintTarget } from './lint_target';
import type { Rule, NamedViolation } from './rule';

export interface LintOptions<T extends LintTarget> {
  fix: boolean;
  getFiles(target: T): Iterable<RepoPath>;
}

export async function runLintRules<T extends LintTarget, R extends Rule<T>>(
  log: ToolingLog,
  targets: T[],
  rules: R[],
  options: LintOptions<T>
) {
  let errorCount = 0;
  let fixedCount = 0;
  let includeFixHint = false;
  const ruleCache = new Map<Rule<any>, unknown>();

  for (const target of targets) {
    log.debug('starting to lint package:', target.repoRel);

    const unfixedErrors: NamedViolation[] = [];
    const fixedFileContent = new Map<string, string>();

    function getSourceToFix(pkgRel: string) {
      try {
        return Fs.readFileSync(target.resolve(pkgRel), 'utf8');
      } catch (error) {
        if (error.code === 'ENOENT') {
          throw new Error(`unable to create file ${pkgRel} in ${target.name} with a fixer`);
        }

        throw error;
      }
    }

    await log.indent(4, async () => {
      let refreshTsProject = false;
      for (const rule of rules) {
        if (refreshTsProject) {
          refreshTsProject = false;
          const fixedTsConfig = fixedFileContent.get('tsconfig.json');
          if (!fixedTsConfig) {
            throw new Error(
              'unable to refresh tsProject if there is no fixed tsconfig.json content'
            );
          }

          log.debug('overriding ts project with fixed config');
          target.getTsProject()?.overrideConfig(fixedTsConfig);
        }

        log.debug('rule:', rule.name);
        await log.indent(4, async () => {
          const errors = await rule.check(target, ruleCache, options.getFiles(target), log);

          for (const error of errors) {
            const fixes = error.fixes ? Object.entries(error.fixes) : [];

            if (fixes.length && !options.fix) {
              includeFixHint = true;
              unfixedErrors.push(error);
              continue;
            }

            if (!fixes.length) {
              unfixedErrors.push(error);
              continue;
            }

            for (const [pkgRel, fix] of fixes) {
              let update;
              const current = fixedFileContent.get(pkgRel) ?? getSourceToFix(pkgRel);
              try {
                update = fix(current);
              } catch (e) {
                log.debug(`error fixing to ${pkgRel} in ${target.name}:`, e);
              }

              if (update !== undefined && update !== current) {
                fixedFileContent.set(pkgRel, update);
                if (pkgRel === 'tsconfig.json') {
                  refreshTsProject = true;
                }
              } else {
                unfixedErrors.push(error);
              }
            }
          }
        });
      }
    });

    for (const [pkgRel, content] of fixedFileContent) {
      Fs.writeFileSync(target.resolve(pkgRel), content, 'utf8');
      fixedCount += 1;
      log.debug('fixed', pkgRel);

      if (pkgRel === 'tsconfig.json') {
        target.getTsProject()?.reloadFromDisk();
      }
    }

    if (unfixedErrors.length) {
      let msg = `Lint errors in ${target.repoRel}:\n`;
      for (const error of unfixedErrors) {
        msg += `  [${error.name}]: ${error.msg
          .split('\n')
          .map((l, i) => (i === 0 ? l : `  ${l}`))
          .join('\n')}\n`;
      }
      errorCount += 1;
      log.error(msg);
    }
  }

  if (fixedCount) {
    log.success(`Applied ${fixedCount} fixes to packages`);
  }

  if (errorCount) {
    if (options.fix) {
      log.error(`Found ${errorCount} un-fixable errors when linting packages.`);
    } else {
      log.error(`Found ${errorCount} errors when linting packages.`);
      if (includeFixHint) {
        log.warning(
          'Some of those errors are fixable, but require that you pass "--fix" to be applied.'
        );
      }
    }
  } else {
    log.success('All packages linted successfully');
  }

  return {
    lintingErrorCount: errorCount,
  };
}
