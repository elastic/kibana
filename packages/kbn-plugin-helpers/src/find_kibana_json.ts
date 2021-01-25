/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import Path from 'path';
import Fs from 'fs';
import { promisify } from 'util';

const existsAsync = promisify(Fs.exists);

export async function findKibanaJson(directory: string): Promise<string | undefined> {
  if (await existsAsync(Path.resolve(directory, 'kibana.json'))) {
    return directory;
  }

  const parent = Path.dirname(directory);
  if (parent === directory) {
    return undefined;
  }

  return findKibanaJson(parent);
}
