/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ToolingLog } from '@kbn/tooling-log';
import { REPO_ROOT } from '@kbn/utils';
import { join } from 'path';
import del from 'del';

export const clean = async ({ log }: { log: ToolingLog }) => {
  log.info('Cleaning Storybook build folder');

  const dir = join(REPO_ROOT, 'built_assets', 'storybook');
  log.info('Deleting folder:', dir);
  await del([join(dir, '*')]);
  await del([dir]);
};
