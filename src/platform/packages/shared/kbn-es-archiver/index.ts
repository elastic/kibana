/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export type { LoadActionPerfOptions } from './src/lib/docs';
export { EsArchiver } from './src/es_archiver';

/**
 * Lazy-loaded to keep the CLI's transitive deps (e.g. `@kbn/dev-cli-runner`
 * → `@kbn/ci-stats-reporter` → `axios`) out of consumer import graphs such
 * as Cypress configs loaded by the Cypress-embedded `tsx`.
 */
export function runCli() {
  return import('./src/cli').then((m) => m.runCli());
}
