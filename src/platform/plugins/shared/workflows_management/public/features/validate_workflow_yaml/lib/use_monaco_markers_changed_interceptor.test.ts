/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { act, renderHook } from '@testing-library/react';
import { z } from '@kbn/zod/v4';
import { useMonacoMarkersChangedInterceptor } from './use_monaco_markers_changed_interceptor';
import { MarkerSeverity } from '../../../widgets/workflow_yaml_editor/lib/utils';
import { BATCHED_CUSTOM_MARKER_OWNER } from '../model/types';

jest.mock('./filter_monaco_yaml_markers', () => ({
  filterMonacoYamlMarkers: jest.fn((markers: any[]) => markers),
}));
jest.mock('./format_monaco_yaml_marker', () => ({
  formatMonacoYamlMarker: jest.fn((marker: any) => marker),
}));

const mockModel = {} as any;

describe('useMonacoMarkersChangedInterceptor', () => {
  it('should produce unique ids for markers from different sources on the same range', () => {
    const { result } = renderHook(() =>
      useMonacoMarkersChangedInterceptor({
        yamlDocumentRef: { current: null },
        workflowYamlSchema: z.object({}),
      })
    );

    const sharedRange = {
      startLineNumber: 5,
      startColumn: 10,
      endLineNumber: 5,
      endColumn: 30,
      severity: MarkerSeverity.Error,
    };

    const markers = [
      { ...sharedRange, message: 'Unknown variable', source: 'variable-validation' },
      { ...sharedRange, message: 'Invalid Liquid syntax', source: 'liquid-template-validation' },
    ];

    act(() => {
      result.current.handleMarkersChanged(mockModel, BATCHED_CUSTOM_MARKER_OWNER, markers as any);
    });

    const errors = result.current.validationErrors;
    expect(errors).toHaveLength(2);

    const [varError, liquidError] = errors;
    expect(varError.id).not.toEqual(liquidError.id);
    expect(varError.id).toContain('variable-validation');
    expect(liquidError.id).toContain('liquid-template-validation');
  });
});
