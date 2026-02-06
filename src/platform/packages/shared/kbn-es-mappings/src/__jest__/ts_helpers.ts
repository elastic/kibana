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

export function getDiagnosticsIgnoringTsIgnores(
  filePath: string,
  program: ts.Program
): readonly ts.Diagnostic[] {
  const sourceFile = program.getSourceFile(filePath);
  const compilerOptions = program.getCompilerOptions();

  if (!sourceFile) {
    return [];
  }

  // Get the original source text
  let fileText = sourceFile.getFullText();

  // Replace all occurrences of @ts-ignore and @ts-expect-error
  // This is a simple regex replacement; be cautious of potential edge cases (e.g., comments within strings)
  fileText = fileText.replace(/\/\/ *@ts-(ignore|expect-error)/g, '// @ts-disabled-diagnostic');

  // Create a new SourceFile with the modified text.
  const modifiedSourceFile = ts.createSourceFile(
    filePath,
    fileText,
    compilerOptions.target || ts.ScriptTarget.ESNext,
    true
  );

  // Create a new Program *just* for this modified source file to get accurate diagnostics
  // Use createCompilerHost to get a proper CompilerHost with all required methods
  const host = ts.createCompilerHost(compilerOptions, true);

  // Store the original getSourceFile method
  const originalGetSourceFile = host.getSourceFile.bind(host);

  // Override the getSourceFile to return our modified version
  host.getSourceFile = (fileName, languageVersion, onError, shouldCreateNewSourceFile) => {
    if (fileName === filePath) {
      return modifiedSourceFile;
    }
    return originalGetSourceFile(fileName, languageVersion, onError, shouldCreateNewSourceFile);
  };

  const modifiedProgram = ts.createProgram([filePath], compilerOptions, host);

  // Now get the diagnostics from the modified program.
  // The comments have been replaced, so they won't suppress errors.
  const diagnostics = ts.getPreEmitDiagnostics(modifiedProgram, modifiedSourceFile);

  return diagnostics;
}

// Create program with the fixture file and its dependencies
export const createProgramForFixture = (fixturePath: string) => {
  const tsconfigPath = path.join(__dirname, '..', '..', 'tsconfig.json');
  const tsBuildInfoFile = path.join(__dirname, '..', '..', 'tsconfig.tsbuildinfo');
  const basePath = path.dirname(tsconfigPath);

  const typesPath = path.join(basePath, 'src', 'types.ts');
  const mappingsPath = path.join(basePath, 'src', 'mappings.ts');
  const utilsPath = path.join(basePath, 'src', 'utils.ts');

  const configFile = ts.readConfigFile(tsconfigPath, ts.sys.readFile);
  const parsedConfig = ts.parseJsonConfigFileContent(
    configFile.config,
    ts.sys,
    path.dirname(tsconfigPath)
  );

  // Remove incremental option to avoid issues with programmatic type checking
  const options = {
    ...parsedConfig.options,
    incremental: true,
    tsBuildInfoFile,
  };

  return ts.createProgram([fixturePath, typesPath, mappingsPath, utilsPath], options);
};

export const groupDiagnosticsByLine = (filePath: string, diagnostics: readonly ts.Diagnostic[]) => {
  const fixtureDiagnostics = diagnostics.filter((diagnostic) => {
    if (diagnostic.file) {
      return diagnostic.file.fileName.includes(filePath);
    }
    return false;
  });

  const errorsByLine: { errorMessage: string; lineNumber: number; tsErrorLine: string[] }[] = [];

  fixtureDiagnostics.forEach((diagnostic) => {
    if (diagnostic.file) {
      const { line } = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start || 0);
      const lineNumber = line + 1;

      const sourceCode = diagnostic.file.getFullText();

      const tsErrorLine = [
        sourceCode
          .split('\n')
          [line - 1].replace(/\/\/ @ts-disabled-diagnostic ?-?/g, 'Type Error Explanation:')
          .trim(),
        `Error Line [${lineNumber}]: ${sourceCode.split('\n')[line].trim()}`,
      ];

      errorsByLine.push({
        errorMessage: ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'),
        lineNumber,
        tsErrorLine,
      });
    }
  });

  return errorsByLine;
};
