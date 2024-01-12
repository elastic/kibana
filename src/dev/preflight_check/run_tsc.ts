/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { REPO_ROOT } from '@kbn/repo-info';
import { execSync } from 'child_process';
import { SingleBar } from 'cli-progress';
import { readFile, unlink, writeFile } from 'fs/promises';
import { dirname, relative } from 'path';
import { File } from '../file';
import { findFileUpwards } from './find_file_upwards';

export async function checkTypescriptFiles(
  files: Array<{ path: string; file: File }>,
  bar?: SingleBar
) {
  const logs = [];
  for (const { path } of files) {
    bar?.increment();
    bar?.update({ filename: path });

    const tsConfigForFile = await findFileUpwards(dirname(path), 'tsconfig.json');

    if (!tsConfigForFile) {
      throw new Error(`Could not find tsconfig.json for ${path}`);
    }

    const projectPath = dirname(tsConfigForFile);

    const tsConfigFile = await readFile(tsConfigForFile, 'utf-8');

    const relativePath = `${REPO_ROOT}/${path}`.replace(dirname(tsConfigForFile), '').slice(1);

    const relativeToRepoRoot = relative(tsConfigForFile, REPO_ROOT).substring(3);

    const tempTsConfigContents = {
      ...JSON.parse(tsConfigFile.replace(/,([ |\t|\n]+[\}|\]|\)])/g, '$1')),
      include: [`${relativeToRepoRoot}/packages/kbn-i18n`, relativePath],
    };

    const tempTsConfig = `${projectPath}/tsconfig.temp.json`;
    await writeFile(`${tempTsConfig}`, JSON.stringify(tempTsConfigContents));

    try {
      execSync(`npx tsc -p ${tempTsConfig} --noEmit`);
    } catch (error) {
      logs.push(`${path} has Typescript errors`);
    }

    // Cleanup
    await unlink(tempTsConfig);
  }

  return logs;
}
