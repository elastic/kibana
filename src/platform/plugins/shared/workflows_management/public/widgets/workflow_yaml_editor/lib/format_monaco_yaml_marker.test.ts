/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License v 1".
 */

import { parseDocument } from 'yaml';
import type { monaco } from '@kbn/monaco';
import { z } from '@kbn/zod';
import { formatMonacoYamlMarker } from './format_monaco_yaml_marker';

const createMockModel = (content: string): monaco.editor.ITextModel => {
  const lines = content.split('\n');
  return {
    getOffsetAt: (position: monaco.Position) => {
      let offset = 0;
      for (let i = 1; i < position.lineNumber; i++) {
        offset += (lines[i - 1]?.length ?? 0) + 1;
      }
      offset += position.column - 1;
      return offset;
    },
  } as unknown as monaco.editor.ITextModel;
};

const mockSchema = z.object({
  steps: z.array(
    z.object({
      name: z.string(),
      with: z.object({ message: z.array(z.string()) }).optional(),
    })
  ),
});

describe('formatMonacoYamlMarker', () => {
  it('should return null for markers on dynamic values', () => {
    const yaml = `steps:
  - name: step1
    with:
      message: "${{ env.USER }}"
`;
    const doc = parseDocument(yaml);
    const model = createMockModel(yaml);
    const position = yaml.indexOf('"${{ env.USER }}"');
    const lines = yaml.substring(0, position).split('\n');

    const marker: monaco.editor.IMarkerData = {
      severity: monaco.MarkerSeverity.Error,
      message: 'Incorrect type. Expected array',
      startLineNumber: lines.length,
      startColumn: lines[lines.length - 1].length + 1,
      endLineNumber: lines.length,
      endColumn: lines[lines.length - 1].length + 1 + '"${{ env.USER }}"'.length,
    };

    const result = formatMonacoYamlMarker(marker, model, mockSchema, doc);
    expect(result).toBeNull();
  });

  it('should not suppress markers for non-dynamic values', () => {
    const yaml = `steps:
  - name: step1
    with:
      message: "regular string"
`;
    const doc = parseDocument(yaml);
    const model = createMockModel(yaml);
    const position = yaml.indexOf('"regular string"');
    const lines = yaml.substring(0, position).split('\n');

    const marker: monaco.editor.IMarkerData = {
      severity: monaco.MarkerSeverity.Error,
      message: 'Incorrect type. Expected array',
      startLineNumber: lines.length,
      startColumn: lines[lines.length - 1].length + 1,
      endLineNumber: lines.length,
      endColumn: lines[lines.length - 1].length + 1 + '"regular string"'.length,
    };

    const result = formatMonacoYamlMarker(marker, model, mockSchema, doc);
    expect(result).not.toBeNull();
  });
});

