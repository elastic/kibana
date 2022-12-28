/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Rule } from '../lib/rule';
import { removeCompilerOption } from '../ast';

const NAMES = [
  'declaration',
  'declarationMap',
  'emitDeclarationOnly',
  'skipLibCheck',
  'target',
  'paths',
];

export const forbiddenCompilerOptions = Rule.create('forbiddenCompilerOptions', {
  check({ config, repoRel }) {
    for (const optName of NAMES) {
      if (repoRel === '.buildkite/tsconfig.json' && optName === 'paths') {
        // allow "paths" in this specific config file
        continue;
      }

      const value = config.compilerOptions?.[optName];
      if (value === undefined) {
        continue;
      }

      this.err(`specifying the "${optName}" compiler option is forbidden`, (source) => {
        return removeCompilerOption(source, optName);
      });
    }
  },
});
