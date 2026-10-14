/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { spawnSync } from 'child_process';

import { createFailError } from '@kbn/dev-cli-errors';

import { run } from '@kbn/dev-cli-runner';
import { hasValidationRunFlags } from '@kbn/dev-validation-runner';

import { File } from './file';
import { eslintBinPath } from './eslint';
import { runEslintContract } from './eslint/run_eslint_contract';
import { lintFiles as lintOxlintFiles } from './oxlint/lint_files';

process.env.KIBANA_RESOLVER_HARD_CACHE = 'true';

const OXLINT_UNSUPPORTED_FLAGS = [
  '--fix-dry-run',
  '--fix-type',
  '--stdin',
  '--stdin-filename',
  '--watch',
];

const hasArg = (flag) =>
  process.argv.slice(2).some((arg) => arg === flag || arg.startsWith(`${flag}=`));

const runLegacyOxlint = async (log, flags) => {
  const unsupportedFlag = process.argv
    .slice(2)
    .find((arg) =>
      OXLINT_UNSUPPORTED_FLAGS.some((flag) => arg === flag || arg.startsWith(`${flag}=`))
    );
  if (unsupportedFlag) {
    throw createFailError(
      `scripts/eslint ${unsupportedFlag} is not supported after Oxlint migration. Run node scripts/eslint and node scripts/lint separately.`
    );
  }

  const paths = flags._.map((path) => new File(path));
  return lintOxlintFiles(log, paths, {
    fix: flags.fix,
    fullRepo: paths.length === 0,
  });
};

const runLegacyEslint = () => {
  if (hasArg('--help') || hasArg('-h')) {
    console.log(
      "This is a wrapper around ESLint's CLI that sets some defaults - see Eslint's help for flags:"
    );
    require(eslintBinPath); // eslint-disable-line import/no-dynamic-require
    return;
  }
  if (hasArg('--print-config') || hasArg('--version') || hasArg('-v')) {
    require(eslintBinPath); // eslint-disable-line import/no-dynamic-require
    return;
  }

  run(
    async ({ log, flags }) => {
      flags._ = flags._ || [];
      const oxlintResult = await runLegacyOxlint(log, flags);

      // verbose is only a flag for our CLI runner, not for ESLint
      if (process.argv.includes('--verbose')) {
        process.argv.splice(process.argv.indexOf('--verbose'), 1);
      } else {
        process.argv.push('--quiet');
      }

      if (flags.cache) {
        process.argv.push('--cache');
      }

      if (!flags._.ext) {
        process.argv.push('--ext', '.js,.mjs,.ts,.tsx');
      }

      const eslintResult = spawnSync(process.execPath, [eslintBinPath, ...process.argv.slice(2)], {
        stdio: 'inherit',
      });
      if (eslintResult.error) {
        throw eslintResult.error;
      }

      if (eslintResult.status !== 0) {
        process.exitCode = eslintResult.status ?? 1;
      }
      if (oxlintResult.failedFiles.length > 0) {
        process.exitCode = 1;
      }

      process.on('exit', (code) => {
        if (!code) {
          console.log('✅ no eslint errors found');
        }
      });
    },
    {
      description: 'Run ESLint on all JavaScript/TypeScript files in the repository',
      usage: 'node scripts/eslint.js [options] [<file>...]',
      flags: {
        allowUnexpected: true,
        boolean: ['cache', 'fix', 'quiet'],
        string: ['ext'],
      },
    }
  );
};

if (hasValidationRunFlags(process.argv.slice(2))) {
  runEslintContract();
} else {
  runLegacyEslint();
}
