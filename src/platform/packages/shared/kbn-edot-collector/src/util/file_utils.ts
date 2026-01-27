/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { promises as Fs } from 'fs';
import Path from 'path';

export async function createDirIfNotExists(dir: string): Promise<void> {
  const dirExists = await Fs.stat(dir)
    .then((stat) => stat.isDirectory())
    .catch(() => false);

  if (!dirExists) {
    await Fs.mkdir(dir, { recursive: true });
  }
}

export async function writeFile(filePath: string, content: string): Promise<void> {
  const dir = Path.dirname(filePath);

  await createDirIfNotExists(dir);

  await Fs.writeFile(filePath, content, 'utf8');
}
