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
  const disableCountOutputs = await Promise.all([
    execSync(`grep -rE 'eslint-disable-next-line|eslint-disable-line' ${path} | wc -l`),
    execSync(`grep -rE 'eslint-disable ' ${path} | wc -l`),
  ]);
  const eslintDisableLineCount = Number.parseInt(disableCountOutputs[0].toString(), 10);

  if (eslintDisableLineCount === undefined || isNaN(eslintDisableLineCount)) {
    throw new Error(`Parsing ${disableCountOutputs[0]} failed to product a valid number`);
  }

  const eslintDisableFileCount = Number.parseInt(disableCountOutputs[1].toString(), 10);

  if (eslintDisableFileCount === undefined || isNaN(eslintDisableFileCount)) {
    throw new Error(`Parsing ${disableCountOutputs[1]} failed to product a valid number`);
  }

  return { eslintDisableFileCount, eslintDisableLineCount };
}
