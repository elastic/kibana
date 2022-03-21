/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/* eslint-disable no-console */

import Path from 'path';
import Fsp from 'fs/promises';

import * as ts from 'typescript';
import stripAnsi from 'strip-ansi';
import normalizePath from 'normalize-path';

import { loadTsConfigFile } from '../lib/tsconfig_file';
import { createTsProject } from '../lib/ts_project';
import { TestLog } from '../lib/log';
import { summarizePackage } from '../summarize_package';

const TMP_DIR = Path.resolve(__dirname, '../../__tmp__');

const DIAGNOSTIC_HOST = {
  getCanonicalFileName: (p: string) => p,
  getCurrentDirectory: () => process.cwd(),
  getNewLine: () => '\n',
};

function dedent(string: string) {
  const lines = string.split('\n');
  while (lines.length && lines[0].trim() === '') {
    lines.shift();
  }
  if (lines.length === 0) {
    return '';
  }
  const indent = lines[0].split('').findIndex((c) => c !== ' ');
  return lines.map((l) => l.slice(indent)).join('\n');
}

function ensureDts(path: string) {
  if (path.endsWith('.d.ts')) {
    throw new Error('path should end with .ts, not .d.ts');
  }
  return `${path.slice(0, -3)}.d.ts`;
}

interface Options {
  /* Other files which should be available to the test execution */
  otherFiles?: Record<string, string>;
}

class MockCli {
  /* file contents which will be fed into TypeScript for this test */
  public readonly mockFiles: Record<string, string>;

  /* directory where mockFiles pretend to be from */
  public readonly sourceDir = Path.resolve(TMP_DIR, 'src');
  /* directory where we will write .d.ts versions of mockFiles */
  public readonly dtsOutputDir = Path.resolve(TMP_DIR, 'dist_dts');
  /* directory where output will be written */
  public readonly outputDir = Path.resolve(TMP_DIR, 'dts');
  /* path where the tsconfig.json file will be written */
  public readonly tsconfigPath = Path.resolve(this.sourceDir, 'tsconfig.json');

  /* .d.ts file which we will read to discover the types we need to summarize */
  public readonly inputPath = ensureDts(Path.resolve(this.dtsOutputDir, 'index.ts'));
  /* the location we will write the summarized .d.ts file */
  public readonly outputPath = Path.resolve(this.outputDir, Path.basename(this.inputPath));
  /* the location we will write the sourcemaps for the summaried .d.ts file */
  public readonly mapOutputPath = `${this.outputPath}.map`;

  constructor(tsContent: string, options?: Options) {
    this.mockFiles = {
      ...options?.otherFiles,
      'index.ts': tsContent,
    };
  }

  private buildDts() {
    const program = createTsProject(
      loadTsConfigFile(this.tsconfigPath),
      Object.keys(this.mockFiles).map((n) => Path.resolve(this.sourceDir, n))
    );

    this.printDiagnostics(`dts/config`, program.getConfigFileParsingDiagnostics());
    this.printDiagnostics(`dts/global`, program.getGlobalDiagnostics());
    this.printDiagnostics(`dts/options`, program.getOptionsDiagnostics());
    this.printDiagnostics(`dts/semantic`, program.getSemanticDiagnostics());
    this.printDiagnostics(`dts/syntactic`, program.getSyntacticDiagnostics());
    this.printDiagnostics(`dts/declaration`, program.getDeclarationDiagnostics());

    const result = program.emit(undefined, undefined, undefined, true);
    this.printDiagnostics('dts/results', result.diagnostics);
  }

  private printDiagnostics(type: string, diagnostics: readonly ts.Diagnostic[]) {
    const errors = diagnostics.filter((d) => d.category === ts.DiagnosticCategory.Error);
    if (!errors.length) {
      return;
    }

    const message = ts.formatDiagnosticsWithColorAndContext(errors, DIAGNOSTIC_HOST);

    console.error(
      `TS Errors (${type}):\n${message
        .split('\n')
        .map((l) => `  ${l}`)
        .join('\n')}`
    );
  }

  async run() {
    const log = new TestLog('debug');

    // wipe out the tmp dir
    await Fsp.rm(TMP_DIR, { recursive: true, force: true });

    // write mock files to the filesystem
    await Promise.all(
      Object.entries(this.mockFiles).map(async ([rel, content]) => {
        const path = Path.resolve(this.sourceDir, rel);
        await Fsp.mkdir(Path.dirname(path), { recursive: true });
        await Fsp.writeFile(path, dedent(content));
      })
    );

    // write tsconfig.json to the filesystem
    await Fsp.writeFile(
      this.tsconfigPath,
      JSON.stringify({
        include: [`**/*.ts`, `**/*.tsx`],
        compilerOptions: {
          moduleResolution: 'node',
          target: 'es2021',
          module: 'CommonJS',
          strict: true,
          esModuleInterop: true,
          allowSyntheticDefaultImports: true,
          declaration: true,
          emitDeclarationOnly: true,
          declarationDir: '../dist_dts',
          declarationMap: true,
          // prevent loading all @types packages
          typeRoots: [],
        },
      })
    );

    // convert the source files to .d.ts files
    this.buildDts();

    // summarize the .d.ts files into the output dir
    await summarizePackage(log, {
      dtsDir: normalizePath(this.dtsOutputDir),
      inputPaths: [normalizePath(this.inputPath)],
      outputDir: normalizePath(this.outputDir),
      repoRelativePackageDir: 'src',
      tsconfigPath: normalizePath(this.tsconfigPath),
      strictPrinting: false,
    });

    // return the results
    return {
      code: await Fsp.readFile(this.outputPath, 'utf8'),
      map: JSON.parse(await Fsp.readFile(this.mapOutputPath, 'utf8')),
      logs: stripAnsi(log.messages.join('')),
    };
  }
}

export async function run(tsContent: string, options?: Options) {
  const project = new MockCli(tsContent, options);
  return await project.run();
}
