/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { mkdir, readFile, writeFile } from 'fs/promises';

export const fileToJson = async (path: string, def?: Object): Promise<Object | undefined> => {
  try {
    const dir = path.substring(0, path.lastIndexOf('/'));
    await mkdir(dir, { recursive: true });
    const fileContent = await readFile(path, 'utf-8');
    return JSON.parse(fileContent);
  } catch (error) {
    if ((error as unknown as any)?.code === 'ENOENT') {
      return def;
    }
    throw error;
  }
};

export const jsonToFile = async (path: string, value: Object | string) => {
  await writeFile(path, typeof value === 'string' ? value : JSON.stringify(value, null, 2), {
    encoding: 'utf-8',
    flag: 'w',
  });
};
