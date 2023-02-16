/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { resolve } from 'path';
import { run } from '@kbn/dev-cli-runner';
import { createFlagError, createFailError } from '@kbn/dev-cli-errors';

const ROOT = resolve(__dirname, '../../../..');
const flags = {
  string: ['somethingsomething'],
  help: `
--somethingsomething             Not implemented yet
        `,
};

export function loadBigData() {
  run(
    ({ flags, log }) => {
        log.info(`\n### blah, not impl'd yet`)
    },
    {
      description: `

blah

      `,
      flags,
    }
  );
}
