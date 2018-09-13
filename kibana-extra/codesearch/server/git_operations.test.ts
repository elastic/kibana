/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import fs from 'fs';
import Git from 'nodegit';
import { getDefaultBranch } from './git_operations';

function rmDir(dirPath: string) {
  const files = fs.readdirSync(dirPath);
  if (files.length > 0) {
    for (const f of files) {
      const filePath = dirPath + '/' + f;
      if (fs.statSync(filePath).isFile()) {
        fs.unlinkSync(filePath);
      } else {
        rmDir(filePath);
      }
    }
  }
  fs.rmdirSync(dirPath);
}

it('get default branch from a non master repo', async () => {
  const path = '/tmp/testtrunk';
  if (fs.existsSync(path)) {
    rmDir(path);
  }
  await Git.Clone.clone('https://github.com/spacedragon/testtrunk.git', path);
  const defaultBranch = await getDefaultBranch(path);
  expect(defaultBranch).toEqual('trunk');
  rmDir(path);
  return '';
});
