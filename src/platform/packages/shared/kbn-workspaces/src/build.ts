/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { ToolingLog } from '@kbn/tooling-log';
import { exec } from './exec';

type BuildFlag =
  | '--skip-archives'
  | '--skip-cdn-assets'
  | '--skip-os-packages'
  | '--skip-docker-cloud'
  | '--skip-docker-serverless'
  | '--skip-docker-contexts';

const DEFAULT_BUILD_FLAGS = [
  '--skip-archives',
  '--skip-cdn-assets',
  '--skip-os-packages',
  '--skip-docker-cloud',
  '--skip-docker-serverless',
  '--skip-docker-contexts',
];

export interface BuildOptions {
  flags?: BuildFlag[];
}

export async function build({
  log,
  options,
  dir,
}: {
  log: ToolingLog;
  options?: BuildOptions;
  dir: string;
}): Promise<void> {
  const start = performance.now();

  log.info('Starting Kibana build');

  await exec('node', ['scripts/build', ...(options?.flags ?? DEFAULT_BUILD_FLAGS)], {
    cwd: dir,
    log,
  });

  log.info(`Kibana build finished in ${Math.round((performance.now() - start) / 1000)}s`);
}
