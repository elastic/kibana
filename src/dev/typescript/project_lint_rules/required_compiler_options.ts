/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Rule } from './rule';
import { setCompilerOption } from './compiler_options';

const REQUIRED: Array<[string, string]> = [['outDir', 'target/types']];

export const requiredCompilerOptions = Rule.create('requiredCompilerOptions', {
  check(project) {
    for (const [key, value] of REQUIRED) {
      if (project.config.compilerOptions?.[key] !== value) {
        this.err(`the value of the compiler option "${key}" must be set to "${value}"`, (source) =>
          setCompilerOption(source, key, value)
        );
      }
    }
  },
});
