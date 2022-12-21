/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';

import ts from 'typescript';
import { REPO_ROOT } from '@kbn/utils';
import { ImportResolver } from '@kbn/import-resolver';

function readTsConfigFile(path: string) {
  const json = ts.readConfigFile(path, ts.sys.readFile);

  if (json.error) {
    throw new Error(`Unable to load tsconfig file: ${json.error.messageText}`);
  }

  return json.config;
}

function loadTsConfigFile(path: string) {
  return ts.parseJsonConfigFileContent(readTsConfigFile(path) ?? {}, ts.sys, Path.dirname(path));
}

const baseTsConfig = loadTsConfigFile(Path.resolve(REPO_ROOT, 'tsconfig.base.json'));
const resolver = ImportResolver.create(REPO_ROOT);

function isTsCompatible(path: string) {
  const extname = Path.extname(path);
  return extname === '.ts' || extname === '.tsx' || extname === '.js';
}

export const compilerHost: ts.CompilerHost = {
  ...ts.createCompilerHost(baseTsConfig.options),

  resolveModuleNames(moduleNames, sourceFilePath) {
    const dirname = Path.dirname(sourceFilePath);

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
