/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { removeCompilerOption } from '@kbn/json-ast';

import { TsProjectRule } from '@kbn/repo-linter';

const NAMES = [
  'declaration',
  'declarationMap',
  'emitDeclarationOnly',
  'skipLibCheck',
  'target',
  'paths',
  'incremental',
  'composite',
  'rootDir',
];

export const forbiddenCompilerOptions = TsProjectRule.create('forbiddenCompilerOptions', {
  check({ repoRel, tsProject }) {
    for (const optName of NAMES) {
      if (repoRel === '.buildkite/tsconfig.json' && optName === 'paths') {
        // allow "paths" in this specific config file
        continue;
      }

      const value = tsProject.config.compilerOptions?.[optName];
      if (value === undefined) {
        continue;
      }

      this.err(`specifying the "${optName}" compiler option is forbidden`, {
        ['tsconfig.json']: (source) => {
          return removeCompilerOption(source, optName);
        },
      });
    }
  },
});
