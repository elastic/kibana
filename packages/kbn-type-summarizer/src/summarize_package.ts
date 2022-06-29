/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Logger } from '@kbn/type-summarizer-core';

import { createTsProject } from './lib/ts_project';
import { loadTsConfigFile } from './lib/tsconfig_file';
import { SourceMapper } from './lib/source_mapper';
import { AstIndexer } from './lib/ast_indexer';
import { SourceFileMapper } from './lib/source_file_mapper';
import { TypeSummary } from './lib/type_summary';

/**
 * Options used to customize the summarizePackage function
 */
export interface SummarizePacakgeOptions {
  /**
   * Absolute path to the directory containing the .d.ts files produced by `tsc`. Maps to the
   * `declarationDir` compiler option.
   */
  dtsDir: string;
  /**
   * Absolute path to the tsconfig.json file for the project we are summarizing
   */
  tsconfigPath: string;
  /**
   * Array of absolute paths to the .d.ts files which will be summarized. Each file in this
   * array will cause an output .d.ts summary file to be created containing all the AST nodes
   * which are exported or referenced by those exports.
   */
  inputPath: string;
  /**
   * Repo-relative path to the package source, for example `packages/kbn-type-summarizer-core` for
   * this package. This is used to provide the correct `sourceRoot` path in the resulting source
   * map files.
   */
  repoRelativePackageDir: string;
}

/**
 * Produce summary .d.ts files for a package
 */
export async function summarizePackage(log: Logger, options: SummarizePacakgeOptions) {
  const tsConfig = log.step('load config', options.tsconfigPath, () =>
    loadTsConfigFile(options.tsconfigPath)
  );

  if (tsConfig.options.sourceRoot) {
    throw new Error(`${options.tsconfigPath} must not define "compilerOptions.sourceRoot"`);
  }

  const program = log.step('create project', options.inputPath, () =>
    createTsProject(tsConfig, [options.inputPath])
  );

  const typeChecker = log.step('create type checker', null, () => program.getTypeChecker());

  const sources = new SourceFileMapper(options.dtsDir);
  const indexer = new AstIndexer(typeChecker, sources, log);

  const sourceFile = program.getSourceFile(options.inputPath);
  if (!sourceFile) {
    throw new Error(`input file wasn't included in the program`);
  }

  const index = indexer.indexExports(sourceFile);
  const sourceMaps = await SourceMapper.forSourceFiles(
    log,
    sources,
    options.repoRelativePackageDir,
    program
  );

  const summary = new TypeSummary(
    indexer,
    sourceMaps,
    log,
    index.locals,
    index.imports,
    index.ambientRefs
  ).getSourceNode();

  sourceMaps.close();

  return summary;
}
