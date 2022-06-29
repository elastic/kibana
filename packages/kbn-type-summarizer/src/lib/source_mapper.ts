/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as ts from 'typescript';
import { SourceNode, SourceMapConsumer, BasicSourceMapConsumer } from 'source-map';

import { Logger, tryReadFile, parseJson, Path, describeNode } from '@kbn/type-summarizer-core';

import { SourceFileMapper } from './source_file_mapper';

type SourceMapConsumerEntry = [ts.SourceFile, BasicSourceMapConsumer | undefined];

export class SourceMapper {
  static async forSourceFiles(
    log: Logger,
    sources: SourceFileMapper,
    repoRelativePackageDir: string,
    program: ts.Program
  ) {
    const entries = await Promise.all(
      program
        .getSourceFiles()
        .filter((f) => !sources.isNodeModule(f.fileName))
        .sort((a, b) => a.fileName.localeCompare(b.fileName))
        .map(async (sourceFile): Promise<undefined | SourceMapConsumerEntry> => {
          if (sources.isNodeModule(sourceFile.fileName)) {
            return;
          }

          const text = sourceFile.getText();
          const match = text.match(/^\/\/#\s*sourceMappingURL=(.*)/im);
          if (!match) {
            return [sourceFile, undefined];
          }

          const relSourceFile = Path.cwdRelative(sourceFile.fileName);
          const sourceMapPath = Path.join(Path.dirname(sourceFile.fileName), match[1]);
          const relSourceMapPath = Path.cwdRelative(sourceMapPath);
          const sourceJson = await tryReadFile(sourceMapPath, 'utf8');
          if (!sourceJson) {
            throw new Error(
              `unable to find source map for [${relSourceFile}] expected at [${match[1]}]`
            );
          }

          const json = parseJson(sourceJson, `source map at [${relSourceMapPath}]`);
          return [sourceFile, await new SourceMapConsumer(json)];
        })
    );

    const consumers = new Map(entries.filter((e): e is SourceMapConsumerEntry => !!e));
    log.debug(
      'loaded sourcemaps for',
      Array.from(consumers.keys()).map((s) => Path.relative(process.cwd(), s.fileName))
    );

    return new SourceMapper(consumers, repoRelativePackageDir);
  }

  private readonly sourceFixDir: string;
  constructor(
    private readonly consumers: Map<ts.SourceFile, BasicSourceMapConsumer | undefined>,
    repoRelativePackageDir: string
  ) {
    this.sourceFixDir = Path.join('/', repoRelativePackageDir);
  }

  /**
   * We ensure that `sourceRoot` is not defined in the tsconfig files, and we assume that the `source` value
   * for each file in the source map will be a relative path out of the bazel-out dir and to the `repoRelativePackageDir`
   * or some path outside of the package in rare situations. Our goal is to convert each of these source paths
   * to new path that is relative to the `repoRelativePackageDir` path. To do this we resolve the `repoRelativePackageDir`
   * as if it was at the root of the filesystem, then do the same for the `source`, so both paths should be
   * absolute, but only include the path segments from the root of the repo. We then get the relative path from
   * the absolute version of the `repoRelativePackageDir` to the absolute version of the `source`, which should give
   * us the path to the source, relative to the `repoRelativePackageDir`.
   */
  fixSourcePath(source: string) {
    return Path.relative(this.sourceFixDir, Path.join('/', source));
  }

  getOriginalSourcePath(sourceFile: ts.SourceFile) {
    const consumer = this.consumers.get(sourceFile);
    if (!consumer) {
      throw new Error(`no source map defined for ${describeNode(sourceFile)}`);
    }

    if (consumer.sources.length !== 1) {
      throw new Error(
        `tsc sourcemap produced ${
          consumer.sources.length
        } source entries, expected 1: ${describeNode(sourceFile)}`
      );
    }

    return this.fixSourcePath(consumer.sources[0]);
  }

  getSourceNode(generatedNode: ts.Node, code: string) {
    const pos = this.findOriginalPosition(generatedNode);

    if (pos && pos.line && pos.column && pos.source) {
      return new SourceNode(pos.line, pos.column, pos.source, code, pos.name ?? undefined);
    }
  }

  findOriginalPosition(node: ts.Node) {
    const dtsSource = node.getSourceFile();

    if (!this.consumers.has(dtsSource)) {
      throw new Error(`sourceFile for [${dtsSource.fileName}] didn't have sourcemaps loaded`);
    }

    const consumer = this.consumers.get(dtsSource);
    if (!consumer) {
      return;
    }

    const posInDts = dtsSource.getLineAndCharacterOfPosition(node.getStart());
    const pos = consumer.originalPositionFor({
      /* ts line column numbers are 0 based, source map column numbers are also 0 based */
      column: posInDts.character,
      /* ts line numbers are 0 based, source map line numbers are 1 based */
      line: posInDts.line + 1,
    });

    return {
      ...pos,
      source: pos.source ? this.fixSourcePath(pos.source) : null,
    };
  }

  close() {
    for (const consumer of this.consumers.values()) {
      consumer?.destroy();
    }
    this.consumers.clear();
  }
}
