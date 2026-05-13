/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parseDocument } from 'yaml';
import { monaco } from '@kbn/monaco';
import { SCHEDULED_INTERVAL_ERROR, SCHEDULED_INTERVAL_PATTERN } from '@kbn/workflows';
import { z } from '@kbn/zod/v4';
import { formatMonacoYamlMarker } from './format_monaco_yaml_marker';

const mockEnrichErrorMessage = jest.fn();

jest.mock('@kbn/workflows/common/utils/yaml', () => ({
  getPathAtOffset: jest.fn().mockReturnValue([]),
}));

jest.mock('@kbn/workflows-yaml', () => ({
  enrichErrorMessage: (...args: any[]) => mockEnrichErrorMessage(...args),
}));

jest.mock('../../../../common/lib/connector_params_schema_resolver', () => ({
  connectorParamsSchemaResolver: jest.fn().mockReturnValue(null),
}));

type IMarkerData = monaco.editor.IMarkerData;
type ITextModel = monaco.editor.ITextModel;

function createMarker(overrides: Partial<IMarkerData> = {}): IMarkerData {
  return {
    startLineNumber: 1,
    startColumn: 1,
    endLineNumber: 1,
    endColumn: 10,
    message: 'some message',
    severity: monaco.MarkerSeverity.Warning,
    ...overrides,
  };
}

function createEditorModel(): ITextModel {
  return {
    getOffsetAt: jest.fn().mockReturnValue(0),
  } as unknown as ITextModel;
}

const dummySchema = z.string();

describe('formatMonacoYamlMarker', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockEnrichErrorMessage.mockReturnValue({ message: 'enriched message', enriched: true });
  });

  it('returns the marker unchanged when source is not yaml-schema', () => {
    const marker = createMarker({ source: 'typescript', severity: monaco.MarkerSeverity.Warning });
    const result = formatMonacoYamlMarker(marker, createEditorModel(), dummySchema, null);

    expect(result.severity).toBe(monaco.MarkerSeverity.Warning);
    expect(result.message).toBe('some message');
  });

  it('upgrades severity to Error for yaml-schema markers', () => {
    const marker = createMarker({
      source: 'yaml-schema:workflow',
      severity: monaco.MarkerSeverity.Warning,
      message: 'Some message',
    });
    const result = formatMonacoYamlMarker(marker, createEditorModel(), dummySchema, null);

    expect(result.severity).toBe(monaco.MarkerSeverity.Error);
  });

  it('replaces message with SCHEDULED_INTERVAL_ERROR when message contains the interval pattern', () => {
    const marker = createMarker({
      source: 'yaml-schema:workflow',
      message: `String does not match the pattern of "${SCHEDULED_INTERVAL_PATTERN.source}"`,
    });
    const result = formatMonacoYamlMarker(marker, createEditorModel(), dummySchema, null);

    expect(result.message).toBe(SCHEDULED_INTERVAL_ERROR);
  });

  it('returns scheduled interval error with upgraded severity', () => {
    const marker = createMarker({
      source: 'yaml-schema:workflow',
      severity: monaco.MarkerSeverity.Warning,
      message: `Pattern "${SCHEDULED_INTERVAL_PATTERN.source}" not matched`,
    });
    const result = formatMonacoYamlMarker(marker, createEditorModel(), dummySchema, null);

    expect(result.message).toBe(SCHEDULED_INTERVAL_ERROR);
    expect(result.severity).toBe(monaco.MarkerSeverity.Error);
  });

  it('should call enrichErrorMessage if message matches a numeric enum pattern', () => {
    const marker = createMarker({
      source: 'yaml-schema:workflow',
      message: 'Invalid enum value. Expected 0 | 1',
    });
    const yamlDoc = parseDocument('key: value');
    const result = formatMonacoYamlMarker(marker, createEditorModel(), dummySchema, yamlDoc);

    expect(mockEnrichErrorMessage).toHaveBeenCalledWith(
      [],
      marker.message,
      'unknown',
      expect.objectContaining({ schema: dummySchema, yamlDocument: yamlDoc })
    );
    expect(result.message).toBe('enriched message');
  });

  it('should call enrichErrorMessage if message matches an invalid type pattern', () => {
    const marker = createMarker({
      source: 'yaml-schema:workflow',
      message: 'Incorrect type. Expected "object"',
    });
    const yamlDoc = parseDocument('key: value');
    const result = formatMonacoYamlMarker(marker, createEditorModel(), dummySchema, yamlDoc);

    expect(mockEnrichErrorMessage).toHaveBeenCalledWith(
      [],
      marker.message,
      'unknown',
      expect.objectContaining({ schema: dummySchema, yamlDocument: yamlDoc })
    );
    expect(result.message).toBe('enriched message');
  });

  describe('numeric enum patterns', () => {
    it.each([
      'Expected "0 | 1 | 2"',
      'Incorrect type. Expected "0 | 1 | 2"',
      'Expected 0 | 1',
      'Invalid enum value. Expected 0 | 1 | 2',
      'Value must be one of: 0, 1, 2',
    ])('formats marker with numeric enum message: %s', (message) => {
      const marker = createMarker({ source: 'yaml-schema:workflow', message });
      const yamlDoc = parseDocument('key: value');
      const result = formatMonacoYamlMarker(marker, createEditorModel(), dummySchema, yamlDoc);

      expect(mockEnrichErrorMessage).toHaveBeenCalled();
      expect(result.message).toBe('enriched message');
    });
  });

  describe('field type error patterns', () => {
    it.each([
      'Incorrect type. Expected "settings"',
      'Expected "connector"',
      'Incorrect type. Expected "my_field"',
    ])('formats marker with field type error: %s', (message) => {
      const marker = createMarker({ source: 'yaml-schema:workflow', message });
      const yamlDoc = parseDocument('key: value');
      const result = formatMonacoYamlMarker(marker, createEditorModel(), dummySchema, yamlDoc);

      expect(mockEnrichErrorMessage).toHaveBeenCalled();
      expect(result.message).toBe('enriched message');
    });
  });

  it('formats connector enum pattern markers', () => {
    const marker = createMarker({
      source: 'yaml-schema:workflow',
      message: 'Expected ".none" | ".cases-webhook" for connector',
    });
    const yamlDoc = parseDocument('key: value');
    const result = formatMonacoYamlMarker(marker, createEditorModel(), dummySchema, yamlDoc);

    expect(mockEnrichErrorMessage).toHaveBeenCalled();
    expect(result.message).toBe('enriched message');
  });

  it('falls back to the original message when enrichErrorMessage throws', () => {
    mockEnrichErrorMessage.mockImplementation(() => {
      throw new Error('enrichment failed');
    });

    const marker = createMarker({
      source: 'yaml-schema:workflow',
      message: 'Expected "0 | 1 | 2"',
    });
    const yamlDoc = parseDocument('key: value');
    const result = formatMonacoYamlMarker(marker, createEditorModel(), dummySchema, yamlDoc);

    // Should fall back to the newMarker (with upgraded severity) but original message
    expect(result.severity).toBe(monaco.MarkerSeverity.Error);
    expect(result.message).toBe('Expected "0 | 1 | 2"');
  });

  it('should return original message if enrichment is not applied', () => {
    mockEnrichErrorMessage.mockReturnValue({ message: 'original', enriched: false });

    const marker = createMarker({
      source: 'yaml-schema:workflow',
      message: 'Invalid enum value. Expected 0 | 1',
    });
    const yamlDoc = parseDocument('key: value');
    const result = formatMonacoYamlMarker(marker, createEditorModel(), dummySchema, yamlDoc);

    expect(result.message).toBe('Invalid enum value. Expected 0 | 1');
  });

  it('does not call enrichErrorMessage for non-matching messages', () => {
    const marker = createMarker({
      source: 'yaml-schema:workflow',
      message: 'Property foo is not allowed',
    });
    const yamlDoc = parseDocument('key: value');
    const result = formatMonacoYamlMarker(marker, createEditorModel(), dummySchema, yamlDoc);

    expect(mockEnrichErrorMessage).not.toHaveBeenCalled();
    expect(result.message).toBe('Property foo is not allowed');
    expect(result.severity).toBe(monaco.MarkerSeverity.Error);
  });

  it('handles null yamlDocument for enum patterns (no YAML path resolution)', () => {
    const marker = createMarker({
      source: 'yaml-schema:workflow',
      message: 'Expected "0 | 1"',
    });
    const result = formatMonacoYamlMarker(marker, createEditorModel(), dummySchema, null);

    expect(mockEnrichErrorMessage).toHaveBeenCalled();
    expect(result.message).toBe('enriched message');
  });

  it('preserves all other marker properties (position, source, etc.)', () => {
    const marker = createMarker({
      source: 'yaml-schema:workflow',
      startLineNumber: 5,
      startColumn: 3,
      endLineNumber: 5,
      endColumn: 20,
      message: 'simple message',
    });
    const result = formatMonacoYamlMarker(marker, createEditorModel(), dummySchema, null);

    expect(result.startLineNumber).toBe(5);
    expect(result.startColumn).toBe(3);
    expect(result.endLineNumber).toBe(5);
    expect(result.endColumn).toBe(20);
    expect(result.source).toBe('yaml-schema:workflow');
  });

  it('handles markers with empty or undefined message', () => {
    const marker = createMarker({
      source: 'yaml-schema:workflow',
      message: '',
    });
    const result = formatMonacoYamlMarker(marker, createEditorModel(), dummySchema, null);

    // Empty message should not match any pattern
    expect(mockEnrichErrorMessage).not.toHaveBeenCalled();
    expect(result.message).toBe('');
  });
});
