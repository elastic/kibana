/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import ts from 'typescript';
import * as path from 'path';
import { createKibanaProgram } from './ts_program';

export function loadFixtureProgram(fixtureFile: string, basepath = __dirname) {
  const fixturePath = path.resolve(basepath, '__fixture__', fixtureFile);

  const tsConfig = ts.findConfigFile('./', ts.sys.fileExists, 'tsconfig.json');
  if (!tsConfig) {
    throw new Error('Could not find a valid tsconfig.json.');
  }

  const program = createKibanaProgram([fixturePath], tsConfig);
  const checker = program.getTypeChecker();

  const sourceFile = program.getSourceFile(fixturePath);
  if (!sourceFile) {
    throw Error('sourceFile is undefined!');
  }
  return { program, checker, sourceFile };
}
