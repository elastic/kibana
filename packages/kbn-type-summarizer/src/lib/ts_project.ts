/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as ts from 'typescript';

/**
 * Parse a tsconfig file and list of input files into a TypeScript Program object.
 */
export function createTsProject(tsConfig: ts.ParsedCommandLine, rootNames: string[]) {
  return ts.createProgram({
    rootNames,
    options: {
      ...tsConfig.options,
      skipLibCheck: false,
    },
    projectReferences: tsConfig.projectReferences,
  });
}
