import * as ts from 'typescript';
import * as path from 'path';
import { createKibanaProgram } from './compiler_host';

export function loadFixtureProgram(fixtureFile: string) {
  const fixturePath = path.resolve(
    __dirname,
    '__fixture__',
    fixtureFile
  );

  const tsConfig = ts.findConfigFile('./', ts.sys.fileExists, 'tsconfig.json');
  if (!tsConfig) {
    throw new Error('Could not find a valid tsconfig.json.');
  }
  
  const program = createKibanaProgram([fixturePath], tsConfig)
  const checker = program.getTypeChecker();

  const sourceFile = program.getSourceFile(fixturePath);
  if (!sourceFile) {
    throw Error('sourceFile is undefined!');
  }
  return { program, checker, sourceFile };
}