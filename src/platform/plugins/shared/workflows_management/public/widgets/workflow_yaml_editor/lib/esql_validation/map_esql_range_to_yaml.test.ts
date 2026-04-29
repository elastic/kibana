/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { monaco } from '@kbn/monaco';
import { buildZeroWidthYamlRange, mapEsqlRangeToYaml } from './map_esql_range_to_yaml';

function createTextModel(content: string): monaco.editor.ITextModel {
  return {
    getValueLength: () => content.length,
    getPositionAt: (offset: number) => {
      const safe = Math.max(0, Math.min(offset, content.length));
      const before = content.slice(0, safe);
      const lines = before.split('\n');
      return {
        lineNumber: lines.length,
        column: lines[lines.length - 1].length + 1,
      } as monaco.Position;
    },
  } as monaco.editor.ITextModel;
}

describe('mapEsqlRangeToYaml', () => {
  it('translates an ES|QL offset range into a Monaco range over the YAML model', () => {
    const yaml = `steps:
  - type: elasticsearch.esql.query
    with:
      query: |
        FROM logs-* | LIMIT 10
`;
    const model = createTextModel(yaml);
    const contentStartInFile = yaml.indexOf('FROM');
    expect(contentStartInFile).toBeGreaterThan(-1);

    const innerRange = { start: 0, end: 4 }; // covers "FROM"
    const range = mapEsqlRangeToYaml(innerRange, contentStartInFile, model);
    expect(range).not.toBeNull();
    expect(range!.startLineNumber).toBe(5);
    expect(range!.endLineNumber).toBe(5);
    expect(range!.endColumn - range!.startColumn).toBe(4);
  });

  it('clamps the end offset to the model length when the range overshoots', () => {
    const yaml = 'short';
    const model = createTextModel(yaml);
    const range = mapEsqlRangeToYaml({ start: 0, end: 100 }, 0, model);
    expect(range).not.toBeNull();
    expect(range!.endColumn).toBe(yaml.length + 1);
  });

  it('returns null when the start offset is outside the model', () => {
    const yaml = 'short';
    const model = createTextModel(yaml);
    expect(mapEsqlRangeToYaml({ start: 0, end: 1 }, 100, model)).toBeNull();
  });

  it('returns null when end < start', () => {
    const yaml = 'FROM';
    const model = createTextModel(yaml);
    expect(mapEsqlRangeToYaml({ start: 5, end: 2 }, 0, model)).toBeNull();
  });
});

describe('buildZeroWidthYamlRange', () => {
  it('produces a collapsed range at the requested offset', () => {
    const yaml = 'a\nbcd';
    const model = createTextModel(yaml);
    const range = buildZeroWidthYamlRange(3, model);
    expect(range.startLineNumber).toBe(2);
    expect(range.endLineNumber).toBe(2);
    expect(range.startColumn).toBe(range.endColumn);
  });
});
