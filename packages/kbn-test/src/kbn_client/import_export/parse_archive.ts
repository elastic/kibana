/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Fs from 'fs/promises';

export interface SavedObject {
  id: string;
  type: string;
  [key: string]: unknown;
}

export async function parseArchive(
  path: string,
  { stripSummary = false }: { stripSummary?: boolean } = {}
): Promise<SavedObject[]> {
  return (await Fs.readFile(path, 'utf-8'))
    .split(/\r?\n\r?\n/)
    .filter((line) => !!line)
    .map((line) => JSON.parse(line))
    .filter(
      stripSummary
        ? (object) => {
            return object.type && object.id;
          }
        : () => true
    );
}
