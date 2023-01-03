/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Rule } from '../lib/rule';
import { setCompilerOption } from '../ast';

const REQUIRED: Array<[string, string]> = [['outDir', 'target/types']];

export const requiredCompilerOptions = Rule.create('requiredCompilerOptions', {
  check({ config }) {
    for (const [key, value] of REQUIRED) {
      if (config.compilerOptions?.[key] !== value) {
        this.err(`the value of the compiler option "${key}" must be set to "${value}"`, (source) =>
          setCompilerOption(source, key, value)
        );
      }
    }
  },
});
