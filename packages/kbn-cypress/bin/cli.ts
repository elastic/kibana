/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import 'source-map-support/register';

import { ValidationError } from '../lib/errors';
import { withError } from '../lib/log';
import { run } from '../lib/run';
import { parseCLIOptions, program } from './lib';

async function main() {
  return run(parseCLIOptions());
}

main()
  .then((result) => {
    if (!result) {
      process.exit(0);
    }
    if (result.status === 'failed') {
      process.exit(1);
    }

    const overallFailed = result.totalFailed + result.totalSkipped;
    if (overallFailed > 0) {
      process.exit(overallFailed);
    }
    process.exit(0);
  })
  .catch((err) => {
    if (err instanceof ValidationError) {
      program.error(withError(err.toString()));
    } else {
      // eslint-disable-next-line no-console
      console.error(err);
    }
    process.exit(1);
  });
