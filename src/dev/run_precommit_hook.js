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
import { createFlagError, combineErrors } from '@kbn/dev-cli-errors';
import { REPO_ROOT } from '@kbn/repo-info';
import * as Eslint from './eslint';
import * as Stylelint from './stylelint';
import { getFilesForCommit, checkFileCasing } from './precommit_hook';
import { load as yamlLoad } from 'js-yaml';
import { readFile } from 'fs/promises';
import { extname } from 'path';

// New code: Define check interfaces
class PrecommitCheck {
  constructor(name) {
    this.name = name;
  }

  // eslint-disable-next-line no-unused-vars
  async execute(_log, _files, _options) {
    throw new Error('execute() must be implemented by check class');
  }
}

// Implement file casing check
class FileCasingCheck extends PrecommitCheck {
  constructor() {
    super('File Casing');
  }

  async execute(log, files) {
    await checkFileCasing(log, files);
  }
}

// Implement linter check base class
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
      log.info('No YAML files to check');
      return;
    }

    log.info(`Checking ${yamlFiles.length} YAML files for syntax errors`);

    const errors = [];
    for (const file of yamlFiles) {
      try {
        const content = await readFile(file, 'utf8');
        // Try parsing the YAML file
        yamlLoad(content, {
          filename: file,
          // Strict mode will error on duplicated keys and other potential issues
          strict: true,
        });
      } catch (error) {
        errors.push(`Error in ${file}:\n${error.message}`);
      }
    }

    if (errors.length > 0) {
      throw new Error('YAML validation failed:\n' + errors.join('\n\n'));
    }
  }
}

// Define available checks
const PRECOMMIT_CHECKS = [
  new FileCasingCheck(),
  new LinterCheck('ESLint', Eslint),
  new LinterCheck('StyleLint', Stylelint),
  new YamlLintCheck(),
];

run(
  async ({ log, flags }) => {
    process.env.IS_KIBANA_PRECOMIT_HOOK = 'true';

    const files = await getFilesForCommit(flags.ref);
    const errors = [];

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

    // Execute all checks
    for (const check of PRECOMMIT_CHECKS) {
      try {
        log.info(`Running ${check.name} check...`);
        await check.execute(log, files, {
          fix: flags.fix,
          stage: flags.stage,
        });
      } catch (error) {
        errors.push(error);
      }
    }

    if (errors.length) {
      throw combineErrors(errors);
    }
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
