/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { spawnSync } from 'child_process';

import { run } from '@kbn/dev-cli-runner';

import { eslintBinPath } from './eslint';

process.env.KIBANA_RESOLVER_HARD_CACHE = 'true';

const options = {
  description: 'Run ESLint on all JavaScript/TypeScript files in the repository',
  usage: 'node scripts/eslint.js [options] [<file>...]',
  flags: {
    allowUnexpected: true,
    boolean: ['cache', 'fix', 'quiet', 'break-on-fix'],
    string: ['ext'],
  },
};

if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(
    "This is a wrapper around ESLint's CLI that sets some defaults - see Eslint's help for flags:"
  );
  require(eslintBinPath); // eslint-disable-line import/no-dynamic-require
} else {
  run(({ flags }) => {
    flags._ = flags._ || [];

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

    if (flags['break-on-fix'] && flags.fix) {
      runEslintWithBreakOnFix(flags._);
    } else {
      // common-js is required so that logic before this executes before loading eslint
      require(eslintBinPath); // eslint-disable-line import/no-dynamic-require

      process.on('exit', (code) => {
        if (!code) {
          console.log('✅ no eslint errors found');
        }
      });
    }
  }, options);
}

function runEslintWithBreakOnFix(passalongArgs) {
  const childArgs = process.argv
    .slice(2)
    .flatMap((arg) => (arg === '--break-on-fix' ? ['--format', 'json'] : [arg]))
    .filter((arg) => arg !== '--quiet');

  const child = spawnSync(process.execPath, [eslintBinPath, ...childArgs, ...passalongArgs], {
    stdio: ['inherit', 'pipe', 'pipe'],
    cwd: process.cwd(),
  });

  const stderr = child.stderr?.toString() ?? '';
  if (stderr) {
    console.error(stderr);
  }

  const stdout = child.stdout?.toString() ?? '';
  let hadFixes = false;
  let hadFailures = false;
  try {
    const results = JSON.parse(stdout || '[]');

    const fixed = results.filter((r) => r.output);
    if (fixed.length > 0) {
      console.warn(`ESLint: Fixed ${fixed.length} file(s):`);
      for (const r of fixed) {
        console.warn(r.filePath);
      }
      hadFixes = true;
    }

    const failed = results.filter((r) => r.errorCount > 0);
    if (failed.length > 0) {
      console.error(`ESLint: ${failed.length} file(s) still have unfixable errors:`);
      for (const r of failed) {
        const messages = r.messages.map(formatLintError);
        console.error(messages.map((m) => `${r.filePath}:${m}`).join('\n'));
      }
      hadFailures = true;
    }
  } catch (_) {
    // if JSON parse fails, rely on child exit code only
  }

  if (hadFixes && !hadFailures) {
    console.warn('ESLint: Fixed some files, breaking the process to prevent unwanted caching.');
    process.exit(1);
  } else if (hadFailures) {
    console.error('ESLint: Failed to fix some files, please fix them manually.');
    process.exit(1);
  } else if (child.status !== 0) {
    console.error('ESLint: Failed to run, please check the output for errors.');
    process.exit(child.status ?? 1);
  } else {
    console.log('✅ no eslint errors found');
    process.exit(0);
  }
}

function formatLintError(error) {
  return `${error.line}:${error.column} ${error.message}`;
}
