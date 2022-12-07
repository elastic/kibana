/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Rule } from './rule';
import { removeCompilerOption } from './compiler_options';

const NAMES = ['declaration', 'emitDeclarationOnly', 'skipLibCheck'];

export const forbiddenCompilerOptions = Rule.create('forbiddenCompilerOptions', {
  check(project) {
    for (const optName of NAMES) {
      const value = project.config.compilerOptions?.[optName];
      if (value === undefined) {
        continue;
      }

      this.err(`specifying the "${optName}" compiler option is forbidden`, (source) => {
        return removeCompilerOption(source, optName);
      });
    }
  },
});
