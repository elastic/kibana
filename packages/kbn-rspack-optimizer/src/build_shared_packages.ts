/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License, v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import execa from 'execa';
import type { ToolingLog } from '@kbn/tooling-log';

export async function buildSharedPackages({
  repoRoot,
  dist = false,
  cache = true,
  log,
}: {
  repoRoot: string;
  dist?: boolean;
  cache?: boolean;
  log?: ToolingLog;
}): Promise<void> {
  const args = ['kbn', 'build-shared'];
  if (dist) {
    args.push('--dist');
  }
  if (!cache) {
    args.push('--no-cache');
  }

  log?.info('Preparing shared frontend bundles...');
  await execa('pnpm', args, { cwd: repoRoot, stdio: 'inherit' });
}
