/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';
import type { PathLike } from 'fs';
import { stat } from 'fs/promises';

const exists = async (path: PathLike) => !!(await stat(path).catch(() => false));

export async function findKibanaJson(directory: string): Promise<string | undefined> {
  if (await exists(Path.resolve(directory, 'kibana.json'))) {
    return directory;
  }

  const parent = Path.dirname(directory);
  if (parent === directory) {
    return undefined;
  }

  return findKibanaJson(parent);
}
