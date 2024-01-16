/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as json5 from 'json5';
import { REPO_ROOT } from '@kbn/repo-info';
import { SingleBar } from 'cli-progress';
import { readFile, writeFile, unlink } from 'fs/promises';
import { relative } from 'path';
import execa from 'execa';
import { File } from '../file';
import { TestResponse } from './create_tests';

export async function checkTypescript(
  files: Array<{ path: string; file: File }>,
  bar?: SingleBar
): Promise<TestResponse> {
  const response: TestResponse = { test: 'typescript', errors: [] };

  if (files.length === 0) {
    return response;
  }

  bar?.increment();
  bar?.update({ filename: files[0].path });

  const paths = [];
  for (const { path } of files) {
    const relativeToRepoRoot = relative(REPO_ROOT, path);
    paths.push(relativeToRepoRoot);
  }

  const tsConfigFile = await readFile(`${REPO_ROOT}/tsconfig.base.json`, 'utf-8');
  const tsConfig = json5.parse(tsConfigFile);
  const tempTsConfigContents = {
    ...tsConfig,
    compilerOptions: {
      ...tsConfig.compilerOptions,
      pretty: true,
    },
    include: [`packages/kbn-i18n`, ...paths],
  };

  const tempTsConfig = `tsconfig.temp.json`;
  await writeFile(`${tempTsConfig}`, JSON.stringify(tempTsConfigContents));

  try {
    const { stdout, stderr } = await execa('npx', ['tsc', '-p', `${tempTsConfig}`, '--noEmit'], {
      env: { FORCE_COLOR: 'true' },
    });
    if (stderr) {
      response.errors.push(stdout);
    }
    bar?.update(files.length, { filename: files[files.length - 1].path });
  } catch (error) {
    response.errors.push(error.stdout);
  }

  // Cleanup
  await unlink(tempTsConfig);

  return response;
}
