/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { execFileSync } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { BuildkiteClient, CiSummary } from '#pipeline-utils';

(async () => {
  try {
    const { url } = await CiSummary.runBuildSummary({
      client: new BuildkiteClient(),
      run: (file, args) => {
        execFileSync(file, args, { stdio: ['ignore', 'inherit', 'inherit'] });
      },
      env: process.env,
      now: () => new Date(),
      schemaPath: join(
        dirname(fileURLToPath(import.meta.url)),
        '../../pipeline-utils/ci-summary/schema.json'
      ),
    });
    console.log(`CI summary published: ${url}`);
  } catch (ex) {
    console.error('CI summary error:', (ex as Error).message);
    process.exit(1);
  }
})();
