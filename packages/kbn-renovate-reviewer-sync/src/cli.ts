/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { run } from '@kbn/dev-cli-runner';
import { generateRenovateCodeowners } from './generate_renovate_codeowners';

export function runCLI(): void {
  run(
    async ({ log, flagsReader }) => {
      const write = flagsReader.boolean('write');
      const check = flagsReader.boolean('check');
      const reportJsonPath = flagsReader.string('report-json');

      const mode = write ? 'write' : check ? 'check' : 'dry-run';

      await generateRenovateCodeowners(log, { mode, reportJsonPath });
    },
    {
      description: 'Sync Renovate reviewers based on code usage and CODEOWNERS',
      usage: 'node scripts/sync_renovate_reviewers.js',
      flags: {
        boolean: ['write', 'check'],
        string: ['report-json'],
        help: `
  --write            Write updates back to renovate.json (default is dry-run)
  --check            Exit non-zero only if managed rules (x_kbn_reviewer_sync.mode=sync) are out of sync (no write)
  --report-json      Write a JSON report to the given path
`,
      },
    }
  );
}
