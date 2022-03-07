/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Fsp from 'fs/promises';
import Path from 'path';

import normalizePath from 'normalize-path';

import { SourceMapper } from './lib/source_mapper';
import { createTsProject } from './lib/ts_project';
import { loadTsConfigFile } from './lib/tsconfig_file';
import { ExportCollector } from './lib/export_collector';
import { isNodeModule } from './lib/is_node_module';
import { Printer } from './lib/printer';
import { Logger } from './lib/log';

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
  inputPaths: string[];
  /**
   * Absolute path to the output directory where the summary .d.ts files should be written
   */
  outputDir: string;
  /**
   * Repo-relative path to the package source, for example `packages/kbn-type-summarizer` for
   * this package. This is used to provide the correct `sourceRoot` path in the resulting source
   * map files.
   */
  repoRelativePackageDir: string;
  /**
   * Should the printer throw an error if it doesn't know how to print an AST node? Primarily
   * used for testing
   */
  strictPrinting?: boolean;
}

/**
 * Produce summary .d.ts files for a package
 */
export async function summarizePackage(log: Logger, options: SummarizePacakgeOptions) {
  const tsConfig = loadTsConfigFile(options.tsconfigPath);
  log.verbose('Created tsconfig', tsConfig);

  if (tsConfig.options.sourceRoot) {
    throw new Error(`${options.tsconfigPath} must not define "compilerOptions.sourceRoot"`);
  }

  const program = createTsProject(tsConfig, options.inputPaths);
  log.verbose('Loaded typescript program');

  const typeChecker = program.getTypeChecker();
  log.verbose('Typechecker loaded');

  const sourceFiles = program
    .getSourceFiles()
    .filter((f) => !isNodeModule(options.dtsDir, f.fileName))
    .sort((a, b) => a.fileName.localeCompare(b.fileName));

  const sourceMapper = await SourceMapper.forSourceFiles(
    log,
    options.dtsDir,
    options.repoRelativePackageDir,
    sourceFiles
  );

  // value that will end up as the `sourceRoot` in the final sourceMaps
  const sourceRoot = `../../../${normalizePath(options.repoRelativePackageDir)}`;

  for (const input of options.inputPaths) {
    const outputPath = Path.resolve(options.outputDir, Path.basename(input));
    const mapOutputPath = `${outputPath}.map`;
    const sourceFile = program.getSourceFile(input);
    if (!sourceFile) {
      throw new Error(`input file wasn't included in the program`);
    }

    const results = new ExportCollector(
      log,
      typeChecker,
      sourceFile,
      options.dtsDir,
      sourceMapper
    ).run();

    const printer = new Printer(
      sourceMapper,
      results.getAll(),
      outputPath,
      mapOutputPath,
      sourceRoot,
      !!options.strictPrinting
    );

    const summary = await printer.print();

    await Fsp.mkdir(options.outputDir, { recursive: true });
    await Fsp.writeFile(outputPath, summary.code);
    await Fsp.writeFile(mapOutputPath, JSON.stringify(summary.map));

    sourceMapper.close();
  }
}
