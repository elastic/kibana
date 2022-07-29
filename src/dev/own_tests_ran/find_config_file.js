/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const { resolve, dirname } = require('path');
const { readdir } = require('fs').promises;

async function* readDir(directory) {
  for (const x of await readdir(directory)) yield x;
}

const isConfig = (x) => /.*config\.(ts|js)/.test(x);
const directoryOf = (x) => dirname(x);

// TODO-TRE: Use a back stop the test directory.
// TODO-TRE: Once it reaches the backstop, stop iterating.
let count = 0;
export const findConfigFile = async (filePath) => {
  if (count === 4) return;
  count++;
  const directory = directoryOf(filePath);
  for await (const x of readDir(directory)) if (isConfig(x)) return resolve(directory, x);

  return await findConfigFile(directory);
};
