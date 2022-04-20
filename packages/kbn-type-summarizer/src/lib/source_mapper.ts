/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as ts from 'typescript';
import { SourceNode, SourceMapConsumer, BasicSourceMapConsumer } from 'source-map';

import { Logger } from './log';
import { tryReadFile } from './helpers/fs';
import { parseJson } from './helpers/json';
import { isNodeModule } from './is_node_module';
import * as Path from './path';

type SourceMapConsumerEntry = [ts.SourceFile, BasicSourceMapConsumer | undefined];

export class SourceMapper {
  static async forSourceFiles(
    log: Logger,
    dtsDir: string,
    repoRelativePackageDir: string,
    sourceFiles: readonly ts.SourceFile[]
  ) {
    const entries = await Promise.all(
      sourceFiles.map(async (sourceFile): Promise<undefined | SourceMapConsumerEntry> => {
        if (isNodeModule(dtsDir, sourceFile.fileName)) {
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

  getSourceNode(generatedNode: ts.Node, code: string) {
    const pos = this.findOriginalPosition(generatedNode);

    if (pos) {
      return new SourceNode(pos.line, pos.column, pos.source, code, pos.name ?? undefined);
    }

    return new SourceNode(null, null, null, code);
  }

  sourceFileCache = new WeakMap<ts.Node, ts.SourceFile>();
  // abstracted so we can cache this
  getSourceFile(node: ts.Node): ts.SourceFile {
    if (ts.isSourceFile(node)) {
      return node;
    }

    const cached = this.sourceFileCache.get(node);
    if (cached) {
      return cached;
    }

    const sourceFile = this.getSourceFile(node.parent);
    this.sourceFileCache.set(node, sourceFile);
    return sourceFile;
  }

  findOriginalPosition(node: ts.Node) {
    const dtsSource = this.getSourceFile(node);

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
  }
}
