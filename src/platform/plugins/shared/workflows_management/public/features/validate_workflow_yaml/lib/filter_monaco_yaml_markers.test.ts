/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parseDocument, Scalar } from 'yaml';
import type { monaco } from '@kbn/monaco';
import { filterMonacoYamlMarkers } from './filter_monaco_yaml_markers';

// Mock getScalarValueAtOffset to control what scalar value is found at a given offset
jest.mock('../../../../common/lib/yaml/get_scalar_value_at_offset', () => ({
  getScalarValueAtOffset: jest.fn(),
}));

const { getScalarValueAtOffset } = jest.requireMock<{
  getScalarValueAtOffset: jest.Mock;
}>('../../../../common/lib/yaml/get_scalar_value_at_offset');

type IMarkerData = monaco.editor.IMarkerData;
type ITextModel = monaco.editor.ITextModel;

function createMarker(overrides: Partial<IMarkerData> = {}): IMarkerData {
  return {
    startLineNumber: 1,
    startColumn: 1,
    endLineNumber: 1,
    endColumn: 10,
    message: 'test error',
    severity: 8, // MarkerSeverity.Error
    ...overrides,
  };
}

function createEditorModel(): ITextModel {
  return {
    getOffsetAt: jest.fn().mockReturnValue(0),
  } as unknown as ITextModel;
}

describe('filterMonacoYamlMarkers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('keeps markers that have no source', () => {
    const markers = [createMarker({ source: undefined })];
    const model = createEditorModel();
    const yamlDoc = parseDocument('key: value');

    const result = filterMonacoYamlMarkers(markers, model, yamlDoc);
    expect(result).toHaveLength(1);
  });

  it('keeps markers whose source does not start with yaml-schema:', () => {
    const markers = [createMarker({ source: 'typescript' })];
    const model = createEditorModel();
    const yamlDoc = parseDocument('key: value');

    const result = filterMonacoYamlMarkers(markers, model, yamlDoc);
    expect(result).toHaveLength(1);
  });

  it('keeps yaml-schema markers when yamlDocument is null', () => {
    const markers = [createMarker({ source: 'yaml-schema:workflow' })];
    const model = createEditorModel();

    const result = filterMonacoYamlMarkers(markers, model, null);
    expect(result).toHaveLength(1);
  });

  it('keeps yaml-schema markers when the scalar at the offset is not a dynamic/variable/liquid value', () => {
    const scalarNode = new Scalar('plain text');
    getScalarValueAtOffset.mockReturnValue(scalarNode);

    const markers = [createMarker({ source: 'yaml-schema:workflow' })];
    const model = createEditorModel();
    const yamlDoc = parseDocument('key: "plain text"');

    const result = filterMonacoYamlMarkers(markers, model, yamlDoc);
    expect(result).toHaveLength(1);
  });

  it('filters out yaml-schema markers on dynamic values (${{ ... }})', () => {
    const scalarNode = new Scalar('${{ steps.output }}');
    getScalarValueAtOffset.mockReturnValue(scalarNode);

    const markers = [createMarker({ source: 'yaml-schema:workflow' })];
    const model = createEditorModel();
    const yamlDoc = parseDocument('key: "${{ steps.output }}"');

    const result = filterMonacoYamlMarkers(markers, model, yamlDoc);
    expect(result).toHaveLength(0);
  });

  it('filters out yaml-schema markers on variable values ({{ ... }})', () => {
    const scalarNode = new Scalar('{{ variable }}');
    getScalarValueAtOffset.mockReturnValue(scalarNode);

    const markers = [createMarker({ source: 'yaml-schema:workflow' })];
    const model = createEditorModel();
    const yamlDoc = parseDocument('key: "{{ variable }}"');

    const result = filterMonacoYamlMarkers(markers, model, yamlDoc);
    expect(result).toHaveLength(0);
  });

  it('filters out yaml-schema markers on Liquid tag values ({% ... %})', () => {
    const scalarNode = new Scalar('{% if condition %}yes{% endif %}');
    getScalarValueAtOffset.mockReturnValue(scalarNode);

    const markers = [createMarker({ source: 'yaml-schema:workflow' })];
    const model = createEditorModel();
    const yamlDoc = parseDocument('key: "{% if condition %}yes{% endif %}"');

    const result = filterMonacoYamlMarkers(markers, model, yamlDoc);
    expect(result).toHaveLength(0);
  });

  it('keeps yaml-schema markers when getScalarValueAtOffset returns null', () => {
    getScalarValueAtOffset.mockReturnValue(null);

    const markers = [createMarker({ source: 'yaml-schema:workflow' })];
    const model = createEditorModel();
    const yamlDoc = parseDocument('key: value');

    const result = filterMonacoYamlMarkers(markers, model, yamlDoc);
    expect(result).toHaveLength(1);
  });

  it('keeps yaml-schema markers when getScalarValueAtOffset throws', () => {
    getScalarValueAtOffset.mockImplementation(() => {
      throw new Error('boom');
    });

    const markers = [createMarker({ source: 'yaml-schema:workflow' })];
    const model = createEditorModel();
    const yamlDoc = parseDocument('key: value');

    const result = filterMonacoYamlMarkers(markers, model, yamlDoc);
    expect(result).toHaveLength(1);
  });

  it('processes each marker independently - filters some, keeps others', () => {
    const dynamicScalar = new Scalar('${{ env.KEY }}');
    const plainScalar = new Scalar('plain');

    getScalarValueAtOffset.mockReturnValueOnce(dynamicScalar).mockReturnValueOnce(plainScalar);

    const markers = [
      createMarker({ source: 'yaml-schema:workflow', message: 'dynamic' }),
      createMarker({ source: 'yaml-schema:workflow', message: 'plain' }),
    ];
    const model = createEditorModel();
    const yamlDoc = parseDocument('a: "${{ env.KEY }}"\nb: plain');

    const result = filterMonacoYamlMarkers(markers, model, yamlDoc);
    expect(result).toHaveLength(1);
    expect(result[0].message).toBe('plain');
  });

  it('passes the correct offset to getScalarValueAtOffset', () => {
    const scalarNode = new Scalar('value');
    getScalarValueAtOffset.mockReturnValue(scalarNode);

    const marker = createMarker({
      source: 'yaml-schema:workflow',
      startLineNumber: 3,
      startColumn: 5,
    });
    const model = createEditorModel();
    (model.getOffsetAt as jest.Mock).mockReturnValue(42);
    const yamlDoc = parseDocument('key: value');

    filterMonacoYamlMarkers([marker], model, yamlDoc);

    expect(model.getOffsetAt).toHaveBeenCalledWith({
      lineNumber: 3,
      column: 5,
    });
    expect(getScalarValueAtOffset).toHaveBeenCalledWith(yamlDoc, 42);
  });

  it('handles an empty markers array', () => {
    const model = createEditorModel();
    const yamlDoc = parseDocument('key: value');

    const result = filterMonacoYamlMarkers([], model, yamlDoc);
    expect(result).toEqual([]);
  });

  it('filters liquid tag values with dashes ({%- ... -%})', () => {
    const scalarNode = new Scalar('{%- assign x = 1 -%}');
    getScalarValueAtOffset.mockReturnValue(scalarNode);

    const markers = [createMarker({ source: 'yaml-schema:workflow' })];
    const model = createEditorModel();
    const yamlDoc = parseDocument('key: "{%- assign x = 1 -%}"');

    const result = filterMonacoYamlMarkers(markers, model, yamlDoc);
    expect(result).toHaveLength(0);
  });
});
