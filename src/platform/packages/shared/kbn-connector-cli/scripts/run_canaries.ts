/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { run } from '@kbn/dev-cli-runner';
import { runCanaries } from '../src/run_canaries/run_canaries';

run(
  async ({ log, flags }) => {
    // An unset string flag arrives as '', so drop empty values.
    const only = [flags.only].flat().filter((v): v is string => typeof v === 'string' && v !== '');
    const results = await runCanaries({ log, dryRun: Boolean(flags['dry-run']), only });
    // A run that executed nothing must not look green.
    if (results.length === 0) {
      log.error('No canary cases ran: no fixtures found, or every case is disabled');
      process.exitCode = 1;
    } else if (results.some((r) => r.outcome !== 'ok')) {
      process.exitCode = 1;
    }
  },
  {
    description:
      'Runs read-only canary fixtures against real vendor APIs through a running Kibana instance',
    flags: {
      boolean: ['dry-run'],
      string: ['only'],
      help: `
        --dry-run       Validate fixtures against the connector specs without executing anything
        --only <specId> Only run the fixture for this spec id, e.g. --only .github (repeatable)
      `,
    },
  }
);
