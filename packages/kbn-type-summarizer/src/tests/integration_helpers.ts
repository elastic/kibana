/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';
import Fsp from 'fs/promises';

import * as ts from 'typescript';
import stripAnsi from 'strip-ansi';
import normalizePath from 'normalize-path';
import { TestLog } from '@kbn/type-summarizer-core';

import { loadTsConfigFile } from '../lib/tsconfig_file';
import { createTsProject } from '../lib/ts_project';
import { summarizePackage } from '../summarize_package';
import { SourceFileMapper } from '../lib/source_file_mapper';
import { AstIndexer } from '../lib/ast_indexer';
import { SourceMapReader } from './source_map_reader';

type DiagFilter = (msg: string) => boolean;

interface InitOptions {
  ignoreDiags?: DiagFilter;
}

export const TMP_DIR = Path.resolve(__dirname, '../../__tmp__');

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

export class TestProject<FileName extends string> {
  /* directory where mockFiles pretend to be from */
  private readonly sourceDir = Path.resolve(TMP_DIR, 'src');
  /* directory where we will write .d.ts versions of mockFiles */
  private readonly dtsOutputDir = Path.resolve(TMP_DIR, 'dist_dts');
  /* path where the tsconfig.json file will be written */
  private readonly tsconfigPath = Path.resolve(this.sourceDir, 'tsconfig.json');

  /* .d.ts file which we will read to discover the types we need to summarize */
  private readonly inputPath = ensureDts(Path.resolve(this.dtsOutputDir, 'index.ts'));

  private readonly log = new TestLog();

  constructor(
    /* file contents which will be fed into TypeScript for this test */
    private readonly _mockFiles: Record<FileName, string>
  ) {}

  private *mockFiles() {
    for (const [key, value] of Object.entries(this._mockFiles)) {
      yield [key, value] as [FileName, string];
    }
  }

  private *fileRels() {
    for (const key of Object.keys(this._mockFiles)) {
      yield key as FileName;
    }
  }

  /**
   * Initialize the TMP_DIR and write files to the sourceDir
   */
  private async setupTempDir() {
    // write mock files to the filesystem
    await Promise.all(
      Array.from(this.mockFiles()).map(async ([rel, content]) => {
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
          types: ['node'],
          // prevent loading all @types packages
          typeRoots: [],
        },
      })
    );
  }

  /**
   * convert the source files in the sourceDir to .d.ts files in the dtrOutputDir
   */
  private async buildDtsOutput(ignoreDiags?: DiagFilter) {
    const program = createTsProject(
      loadTsConfigFile(this.tsconfigPath),
      Array.from(this.fileRels())
        .map((n) => Path.resolve(this.sourceDir, n))
        .filter((p) => p.endsWith('.ts') || p.endsWith('.tsx'))
    );

    this.printDiagnostics(
      [
        [`dts/config`, program.getConfigFileParsingDiagnostics()],
        [`dts/global`, program.getGlobalDiagnostics()],
        [`dts/options`, program.getOptionsDiagnostics()],
        [`dts/semantic`, program.getSemanticDiagnostics()],
        [`dts/syntactic`, program.getSyntacticDiagnostics()],
        [`dts/declaration`, program.getDeclarationDiagnostics()],
      ],
      ignoreDiags
    );

    const result = program.emit(undefined, undefined, undefined, true);

    this.printDiagnostics([['dts/results', result.diagnostics]], ignoreDiags);

    // copy .d.ts files from source to dist
    for (const [rel, content] of this.mockFiles()) {
      if (rel.endsWith('.d.ts')) {
        const path = Path.resolve(this.dtsOutputDir, rel);
        await Fsp.mkdir(Path.dirname(path), { recursive: true });
        await Fsp.writeFile(path, dedent(content as string));
      }
    }
  }

  /**
   * Print diagnostics from TS so we know when something is wrong in the tests
   */
  private printDiagnostics(
    types: Array<[type: string, diagnostics: readonly ts.Diagnostic[]]>,
    ignoreDiags?: DiagFilter
  ) {
    const messages = [];
    for (const [type, diagnostics] of types) {
      const errors = diagnostics.filter((d) => d.category === ts.DiagnosticCategory.Error);
      if (!errors.length) {
        continue;
      }

      const message = ts.formatDiagnosticsWithColorAndContext(errors, DIAGNOSTIC_HOST);
      if (ignoreDiags && ignoreDiags(message)) {
        continue;
      }
      messages.push(
        `  type(${type}):\n${message
          .split('\n')
          .map((l) => `    ${l}`)
          .join('\n')}`
      );
    }

    if (messages.length) {
      throw new Error(`TS produced error diagnostics:\n${messages}`);
    }
  }

  async runTypeSummarizer() {
    await this.setupTempDir();
    await this.buildDtsOutput();

    // summarize the .d.ts files into the output dir
    const sourceNode = await summarizePackage(this.log, {
      dtsDir: normalizePath(this.dtsOutputDir),
      inputPath: normalizePath(this.inputPath),
      repoRelativePackageDir: 'src',
      tsconfigPath: normalizePath(this.tsconfigPath),
    });

    const { map, code } = sourceNode.toStringWithSourceMap();

    // return the results
    return {
      code,
      map: await SourceMapReader.snapshot(map, code, this.sourceDir),
      logs: stripAnsi(this.log.messages.splice(0).join('')),
    };
  }

  async initAstIndexer(options?: InitOptions) {
    await this.setupTempDir();
    await this.buildDtsOutput(options?.ignoreDiags);

    const tsConfig = loadTsConfigFile(this.tsconfigPath);
    const program = createTsProject(tsConfig, [this.inputPath]);
    const typeChecker = program.getTypeChecker();
    const sources = new SourceFileMapper(this.dtsOutputDir);
    const indexer = new AstIndexer(typeChecker, sources, this.log);

    const sourceFiles = Object.fromEntries(
      Array.from(this.fileRels()).map((rel) => [
        rel,
        program.getSourceFile(Path.resolve(this.dtsOutputDir, this.getDtsRel(rel)))!,
      ])
    ) as Record<FileName, ts.SourceFile>;

    return { program, typeChecker, indexer, sourceFiles };
  }

  private getDtsRel(rel: string) {
    if (!rel.endsWith('.d.ts') && rel.endsWith('.ts')) {
      return `${rel.slice(0, -3)}.d.ts`;
    }

    return rel;
  }

  async cleanup() {
    // wipe out the tmp dir
    await Fsp.rm(TMP_DIR, { recursive: true, force: true });
  }
}
