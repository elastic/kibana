/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License v 1".
 */

import { renderHook } from '@testing-library/react';
import { parseDocument } from 'yaml';
import React from 'react';
import type { monaco } from '@kbn/monaco';
import { z } from '@kbn/zod';
import { useMonacoMarkersChangedInterceptor } from './use_monaco_markers_changed_interceptor';

jest.mock(
  '../../../widgets/workflow_yaml_editor/lib/format_monaco_yaml_marker',
  () => ({
    formatMonacoYamlMarker: jest.fn(),
  })
);

import { formatMonacoYamlMarker } from '../../../widgets/workflow_yaml_editor/lib/format_monaco_yaml_marker';

const mockFormatMonacoYamlMarker = formatMonacoYamlMarker as jest.MockedFunction<
  typeof formatMonacoYamlMarker
>;

const mockSchema = z.object({ steps: z.array(z.object({ name: z.string() })) });

describe('useMonacoMarkersChangedInterceptor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should filter out null markers from dynamic values', () => {
    const yamlDoc = parseDocument('steps:\n  - name: "${{ env.USER }}"');
    const yamlDocumentRef = React.createRef<typeof yamlDoc>();
    yamlDocumentRef.current = yamlDoc;

    const { result } = renderHook(() =>
      useMonacoMarkersChangedInterceptor({
        yamlDocumentRef,
        workflowYamlSchema: mockSchema,
      })
    );

    const model = { getOffsetAt: jest.fn() } as unknown as monaco.editor.ITextModel;
    const markers: monaco.editor.IMarkerData[] = [
      {
        severity: monaco.MarkerSeverity.Error,
        message: 'Error 1',
        startLineNumber: 1,
        startColumn: 1,
        endLineNumber: 1,
        endColumn: 10,
      },
      {
        severity: monaco.MarkerSeverity.Error,
        message: 'Error 2',
        startLineNumber: 2,
        startColumn: 1,
        endLineNumber: 2,
        endColumn: 10,
      },
    ];

    mockFormatMonacoYamlMarker.mockImplementation((marker) =>
      marker.message === 'Error 1' ? null : marker
    );

    const transformed = result.current.transformMonacoMarkers(model, 'yaml', markers);

    expect(transformed).toHaveLength(1);
    expect(transformed[0].message).toBe('Error 2');
  });
});

