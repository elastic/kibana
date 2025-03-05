/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as path from 'path';
import ts from 'typescript';
import { REPO_ROOT } from '@kbn/repo-info';
import { ImportResolver } from '@kbn/import-resolver';

function readTsConfigFile(configPath: string) {
  const json = ts.readConfigFile(configPath, ts.sys.readFile);

  if (json.error) {
    throw new Error(`Unable to load tsconfig file: ${json.error.messageText}`);
  }

  return json.config;
}

function loadTsConfigFile(configPath: string) {
  return ts.parseJsonConfigFileContent(
    readTsConfigFile(configPath) ?? {},
    ts.sys,
    path.dirname(configPath)
  );
}

const baseTsConfig = loadTsConfigFile(path.resolve(REPO_ROOT, 'tsconfig.base.json'));
const resolver = ImportResolver.create(REPO_ROOT);

function isTsCompatible(configPath: string) {
  const extname = path.extname(configPath);
  return extname === '.ts' || extname === '.tsx' || extname === '.js';
}

export const compilerHost: ts.CompilerHost = {
  ...ts.createCompilerHost(baseTsConfig.options),

  resolveModuleNames(moduleNames, sourceFilePath) {
    const dirname = path.dirname(sourceFilePath);

    const results: Array<ts.ResolvedModule | undefined> = [];

    for (const req of moduleNames) {
      const result = resolver.resolve(req, dirname);
      if (result?.type !== 'file' || !isTsCompatible(result.absolute)) {
        results.push(undefined);
      } else {
        results.push({
          resolvedFileName: result.absolute,
          isExternalLibraryImport: !!result.nodeModule,
        });
      }
    }

    return results;
  },
};

export function getAllSourceFiles(fullPaths: string[], program: ts.Program): ts.SourceFile[] {
  return fullPaths.map((fullPath) => {
    const sourceFile = program.getSourceFile(fullPath);
    if (!sourceFile) {
      throw Error(`Unable to get sourceFile ${fullPath}.`);
    }
    return sourceFile;
  });
}

export function createKibanaProgram(fullPaths: string[], tsConfig: any): ts.Program {
  const program = ts.createProgram(fullPaths, tsConfig, compilerHost);
  program.getTypeChecker();

  return program;
}
