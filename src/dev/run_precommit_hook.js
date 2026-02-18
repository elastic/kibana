/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import SimpleGit from 'simple-git';

import { run } from '@kbn/dev-cli-runner';
import { createFlagError } from '@kbn/dev-cli-errors';
import { REPO_ROOT } from '@kbn/repo-info';
import { getPackages } from '@kbn/repo-packages';
import * as Eslint from './eslint';
import * as Stylelint from './stylelint';
import { readFileSync } from 'fs';
import { extname, join } from 'path';

import { getFilesForCommit, checkFileCasing } from './precommit_hook';
import { checkSemverRanges } from './no_pkg_semver_ranges';
import { load as yamlLoad } from 'js-yaml';
import { readFile } from 'fs/promises';
import { getExpectedCasing } from './precommit_hook/casing_check_config';

const EXCEPTIONS_JSON_PATH = join(REPO_ROOT, 'src/dev/precommit_hook/exceptions.json');

class CheckResult {
  constructor(checkName) {
    this.checkName = checkName;
    this.errors = [];
    this.succeeded = true;
  }

  addError(error) {
    this.succeeded = false;
    this.errors.push(error);
  }

  toString() {
    if (this.succeeded) {
      return `✓ ${this.checkName}: Passed`;
    } else {
      return [`✗ ${this.checkName}: Failed`, ...this.errors.map((err) => `  - ${err}`)].join('\n');
    }
  }
}

class PrecommitCheck {
  constructor(name) {
    this.name = name;
  }

  async execute() {
    throw new Error('execute() must be implemented by check class');
  }

  async runSafely(log, files, options) {
    const result = new CheckResult(this.name);
    try {
      await this.execute(log, files, options);
    } catch (error) {
      if (error.errors) {
        error.errors.forEach((err) => result.addError(err.message || err.toString()));
      } else {
        result.addError(error.message || error.toString());
      }
    }
    return result;
  }
}

class FileCasingCheck extends PrecommitCheck {
  constructor() {
    super('File Casing');
  }

  async execute(log, files) {
    const packages = getPackages(REPO_ROOT);
    const packageRootDirs = new Set(
      packages
        .filter((pkg) => !pkg.isPlugin())
        .map((pkg) => pkg.normalizedRepoRelativeDir.replace(/\\/g, '/'))
    );

    const rawExceptions = JSON.parse(readFileSync(EXCEPTIONS_JSON_PATH, 'utf8'));
    const exceptions = Object.values(rawExceptions).flatMap((teamObject) =>
      Object.keys(teamObject)
    );

    await checkFileCasing(log, files, getExpectedCasing, {
      packageRootDirs,
      exceptions,
    });
  }
}

class LinterCheck extends PrecommitCheck {
  constructor(name, linter) {
    super(name);
    this.linter = linter;
  }

  async execute(log, files, options) {
    const filesToLint = await this.linter.pickFilesToLint(log, files);
    if (filesToLint.length > 0) {
      await this.linter.lintFiles(log, filesToLint, {
        fix: options.fix,
      });

      if (options.fix && options.stage) {
        const simpleGit = new SimpleGit(REPO_ROOT);
        await simpleGit.add(filesToLint);
      }
    }
  }
}

class YamlLintCheck extends PrecommitCheck {
  constructor() {
    super('YAML Lint');
  }

  isYamlFile(filePath) {
    const ext = extname(filePath).toLowerCase();
    return ext === '.yml' || ext === '.yaml';
  }

  async execute(log, files) {
    const yamlFiles = files.filter((file) => this.isYamlFile(file.getRelativePath()));

    if (yamlFiles.length === 0) {
      log.verbose('No YAML files to check');
      return;
    }

    log.verbose(`Checking ${yamlFiles.length} YAML files for syntax errors`);

    const errors = [];
    for (const file of yamlFiles) {
      try {
        const content = await readFile(file.getAbsolutePath(), 'utf8');
        yamlLoad(content, {
          filename: file.getRelativePath(),
        });
      } catch (error) {
        errors.push(`Error in ${file.getRelativePath()}:\n${error.message}`);
      }
    }

    if (errors.length > 0) {
      throw new Error(errors.join('\n\n'));
    }
  }
}

class SemverRangesCheck extends PrecommitCheck {
  constructor() {
    super('Semver Ranges');
  }

  async execute(log, files, options) {
    log.verbose('Checking for semver ranges in package.json');

    try {
      const result = checkSemverRanges({ fix: options.fix });
      if (result.totalFixes > 0) {
        log.info(`Fixed ${result.totalFixes} semver ranges in package.json`);
      }
    } catch (error) {
      throw error;
    }
  }
}

const PRECOMMIT_CHECKS = [
  new FileCasingCheck(),
  new LinterCheck('ESLint', Eslint),
  new LinterCheck('StyleLint', Stylelint),
  new YamlLintCheck(),
  new SemverRangesCheck(),
];

run(
  async ({ log, flags }) => {
    process.env.IS_KIBANA_PRECOMIT_HOOK = 'true';

    const files = await getFilesForCommit(flags.ref);

    const maxFilesCount = flags['max-files']
      ? Number.parseInt(String(flags['max-files']), 10)
      : undefined;
    if (maxFilesCount !== undefined && (!Number.isFinite(maxFilesCount) || maxFilesCount < 1)) {
      throw createFlagError('expected --max-files to be a number greater than 0');
    }

    if (maxFilesCount && files.length > maxFilesCount) {
      log.warning(
        `--max-files is set to ${maxFilesCount} and ${files.length} were discovered. The current script execution will be skipped.`
      );
      return;
    }

    log.verbose('Running pre-commit checks...');
    const results = await Promise.all(
      PRECOMMIT_CHECKS.map(async (check) => {
        const startTime = Date.now();
        const result = await check.runSafely(log, files, {
          fix: flags.fix,
          stage: flags.stage,
        });
        const duration = Date.now() - startTime;
        log.verbose(`${check.name} completed in ${duration}ms`);
        return result;
      })
    );

    const failedChecks = results.filter((result) => !result.succeeded);

    if (failedChecks.length > 0) {
      const errorReport = [
        '\nPre-commit checks failed:',
        ...results.map((result) => result.toString()),
        '\nPlease fix the above issues before committing.',
      ].join('\n');

      throw new Error(errorReport);
    }

    log.success('All pre-commit checks passed!');
  },
  {
    description: `
    Run checks on files that are staged for commit by default
  `,
    flags: {
      boolean: ['fix', 'stage'],
      string: ['max-files', 'ref'],
      default: {
        fix: false,
        stage: true,
      },
      help: `
        --fix              Execute checks with possible fixes
        --max-files        Max files number to check against. If exceeded the script will skip the execution
        --ref              Run checks against any git ref files (example HEAD or <commit_sha>) instead of running against staged ones
        --no-stage         By default when using --fix the changes are staged, use --no-stage to disable that behavior
      `,
    },
  }
);
