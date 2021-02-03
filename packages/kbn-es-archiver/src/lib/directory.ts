/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { readdir } from 'fs';
import { fromNode } from 'bluebird';

export async function readDirectory(path: string) {
  const allNames = await fromNode<string[]>((cb) => readdir(path, cb));
  return allNames.filter((name) => !name.startsWith('.'));
}
