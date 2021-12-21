/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { execSync } from 'child_process';

export interface EslintDisableCounts {
  eslintDisableLineCount: number;
  eslintDisableFileCount: number;
}

export async function countEslintDisableLine(path: string): Promise<EslintDisableCounts> {
  const disableLineCntOutput = await execSync(
    `grep -rE 'eslint-disable-next-line|eslint-disable-line' ${path} | wc -l`
  );
  const eslintDisableLineCount = Number.parseInt(disableLineCntOutput.toString(), 10);

  if (eslintDisableLineCount === undefined || isNaN(eslintDisableLineCount)) {
    throw new Error(`Parsing ${disableLineCntOutput} failed to product a valid number`);
  }

  const disableFileCntOutput = await execSync(`grep -rE 'eslint-disable ' ${path} | wc -l`);

  const eslintDisableFileCount = Number.parseInt(disableFileCntOutput.toString(), 10);

  if (eslintDisableFileCount === undefined || isNaN(eslintDisableFileCount)) {
    throw new Error(`Parsing ${disableFileCntOutput} failed to product a valid number`);
  }

  return { eslintDisableFileCount, eslintDisableLineCount };
}
