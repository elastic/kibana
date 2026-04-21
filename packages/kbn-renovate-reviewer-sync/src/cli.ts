/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FlagsReader } from '@kbn/dev-cli-runner';
import { run } from '@kbn/dev-cli-runner';
import { createFlagError } from '@kbn/dev-cli-errors';

import type {
  GenerateRenovateCodeownersMode,
  GenerateRenovateCodeownersOptions,
} from './generate_renovate_codeowners';
import { generateRenovateCodeowners } from './generate_renovate_codeowners';

const REPORT_JSON_FLAG = 'report-json';

/**
 * Pure CLI-flag parser. Throws a `FlagError` on invalid input (which
 * `@kbn/dev-cli-runner` catches and renders alongside the help text) and
 * returns validated options for `generateRenovateCodeowners` otherwise.
 *
 * Separated from `runCLI` so flag validation is unit-testable without having
 * to spin up the real `run()` wrapper.
 *
 * @param argv Raw `process.argv.slice(2)`. Used to disambiguate
 *   `--report-json` passed with no value (an error) from `--report-json`
 *   not passed at all (the default — no report is written).
 *   `FlagsReader.string/path` collapses both cases to `undefined`, which
 *   would otherwise let a missing value fail silently.
 * @param flagsReader The `FlagsReader` constructed for this command.
 */
export function parseCliFlags(
  argv: readonly string[],
  flagsReader: FlagsReader
): GenerateRenovateCodeownersOptions {
  const write = flagsReader.boolean('write');
  const check = flagsReader.boolean('check');

  if (write && check) {
    throw createFlagError('--write and --check are mutually exclusive');
  }

  const mode: GenerateRenovateCodeownersMode = write ? 'write' : check ? 'check' : 'dry-run';

  const hasReportJsonFlag = argv.some(
    (a) => a === `--${REPORT_JSON_FLAG}` || a.startsWith(`--${REPORT_JSON_FLAG}=`)
  );
  const reportJsonPath = flagsReader.path(REPORT_JSON_FLAG);
  if (hasReportJsonFlag && !reportJsonPath) {
    throw createFlagError(`--${REPORT_JSON_FLAG} requires a path argument`);
  }

  return { mode, reportJsonPath };
}

export function runCLI(): void {
  run(
    async ({ log, flagsReader }) => {
      const options = parseCliFlags(process.argv.slice(2), flagsReader);
      await generateRenovateCodeowners(log, options);
    },
    {
      description: 'Sync Renovate reviewers based on code usage and CODEOWNERS',
      usage: 'node scripts/sync_renovate_reviewers.js',
      flags: {
        boolean: ['write', 'check'],
        string: [REPORT_JSON_FLAG],
        help: `
  --write            Write updates back to renovate.json (default is dry-run)
  --check            Exit non-zero only if managed rules (x_kbn_reviewer_sync.mode=sync) are out of sync (no write)
  --report-json PATH Write a JSON report to PATH (resolved to an absolute path)

  --write and --check are mutually exclusive.
`,
      },
    }
  );
}
