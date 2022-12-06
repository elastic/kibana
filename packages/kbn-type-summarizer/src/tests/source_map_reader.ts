/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Fs from 'fs';
import Path from 'path';

import { SourceMapConsumer, SourceMapGenerator } from 'source-map';

const ID_RE = /[a-z0-9_]+/i;

export class SourceMapReader {
  static async snapshot(generator: SourceMapGenerator, code: string, sourceDir: string) {
    const genLines = ['', ...code.split('\n')];
    const readSource = (p: string) => {
      const source = Fs.readFileSync(Path.resolve(sourceDir, p), 'utf8');
      return ['', ...source.split('\n')];
    };
    const getId = (line: string, col: number) => {
      return line.slice(col).match(ID_RE)?.[0] ?? line;
    };

    const mappings: string[][] = [];

    await SourceMapConsumer.with(generator.toJSON(), undefined, (map) => {
      map.eachMapping((mapping) => {
        if (
          (mapping.originalColumn as number | boolean | null) === false ||
          mapping.originalColumn === null
        ) {
          // these mappings are just to end the previous mapping, we can drop them
          return;
        }

        const generatedId = getId(genLines[mapping.generatedLine], mapping.generatedColumn);
        const originalId = mapping.source
          ? getId(readSource(mapping.source)[mapping.originalLine], mapping.originalColumn)
          : null;

        mappings.push([
          `from ${generatedId} @ ${mapping.generatedLine}:${mapping.generatedColumn}`,
          `to   ${originalId} @ ${mapping.source}:${mapping.originalLine}:${mapping.originalColumn}`,
        ]);
      });
    });

    return new SourceMapReader(
      mappings.map((g) => g.join('\n')).join('\n\n'),
      JSON.stringify(generator, null, 2)
    );
  }

  constructor(public readonly snapshot: string, public readonly raw: string) {}
}
