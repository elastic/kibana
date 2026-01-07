/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { relative } from 'path';
import { readFile, writeFile, unlink } from 'fs/promises';
import execa from 'execa';
import * as json5 from 'json5';
import { REPO_ROOT } from '@kbn/repo-info';
import { PreflightCheck, TestResponse } from './preflight_check';

export class TypescriptCheck extends PreflightCheck {
  id = 'typescript';

  public async runCheck() {
    const files = Array.from(this.files.values());
    const response: TestResponse = { test: this.id, errors: [] };

    if (files.length === 0) {
      return response;
    }

    const paths = [];
    for (const { path } of files) {
      const relativeToRepoRoot = relative(REPO_ROOT, path);
      paths.push(relativeToRepoRoot);
    }

    const tsConfigFile = await readFile(`${REPO_ROOT}/tsconfig.json`, 'utf-8');
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
    } catch (error) {
      response.errors.push(error.stdout);
    }

    // Cleanup
    await unlink(tempTsConfig);

    return response;
  }
}
