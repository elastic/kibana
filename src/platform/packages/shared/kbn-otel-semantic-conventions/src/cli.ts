/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { run } from '@kbn/dev-cli-runner';
import { runGenerateOtelSemconvCli } from './generate';

export function cli() {
  return run(async ({ log }) => {
    return runGenerateOtelSemconvCli({
      // log: log.withContext('@kbn/otel-semantic-conventions'), // TODO: This function will be available when this PR is merged https://github.com/elastic/kibana/pull/232076
      log,
    });
  });
}
