/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect } from 'react';
import { render, act, waitFor } from '@testing-library/react';
import { monaco } from '@kbn/monaco';
import { WORKFLOW_ZOD_SCHEMA_LOOSE } from '../../../../common/schema';
import { useYamlValidation } from './use_yaml_validation';

let mockCurrentData: any = {};

jest.mock('../../../../common/lib/yaml_utils', () => ({
  parseWorkflowYamlToJSON: jest.fn((text: string) => ({ success: true, data: mockCurrentData })),
  getCurrentPath: jest.fn(() => []),
}));

jest.mock('../../../entities/workflows/lib/get_workflow_graph', () => ({
  getWorkflowGraph: jest.fn(() => ({})),
}));

jest.mock('../../../features/workflow_context/lib/get_context_for_path', () => ({
  getContextForPath: jest.fn(() => ({})),
}));

function ensureMonacoMocks() {
  // Ensure monaco.editor object exists
  (monaco as any).editor = (monaco as any).editor || ({} as any);

  if (!(monaco as any).Range) {
    (monaco as any).Range = function Range(
      startLineNumber: number,
      startColumn: number,
      endLineNumber: number,
      endColumn: number
    ) {
      return { startLineNumber, startColumn, endLineNumber, endColumn } as any;
    } as any;
  }
  if (!(monaco.editor as any).TrackedRangeStickiness) {
    (monaco.editor as any).TrackedRangeStickiness = {
      NeverGrowsWhenTypingAtEdges: 3,
    } as any;
  }
  if (typeof (monaco.editor as any).setModelMarkers !== 'function') {
    (monaco.editor as any).setModelMarkers = () => undefined;
  }
}

function createMockEditor(text: string) {
  const model = {
    getValue: () => text,
    getPositionAt: (offset: number) => {
      const upTo = text.slice(0, offset);
      const lines = upTo.split('\n');
      const lineNumber = lines.length;
      const column = (lines[lines.length - 1]?.length ?? 0) + 1;
      return { lineNumber, column };
    },
    uri: { path: '/test' },
  } as any;

  const editor = {
    getModel: () => model,
    createDecorationsCollection: () => ({ clear: () => {} }),
  } as any;

  return editor;
}

function Harness({ text }: { text: string }) {
  const { validateVariables } = useYamlValidation({
    workflowYamlSchema: WORKFLOW_ZOD_SCHEMA_LOOSE,
  });

  useEffect(() => {
    ensureMonacoMocks();
    const editor = createMockEditor(text);
    // Fire and forget; tests will wait for setModelMarkers to be called
    void validateVariables(editor);
  }, [text, validateVariables]);

  return null;
}

describe('useYamlValidation manual-only API step warning', () => {
  let setModelMarkersSpy: jest.SpyInstance;

  beforeEach(() => {
    ensureMonacoMocks();
    setModelMarkersSpy = jest
      .spyOn(monaco.editor, 'setModelMarkers')
      .mockImplementation(() => undefined as any);
  });

  afterEach(() => {
    setModelMarkersSpy.mockRestore();
  });

  it('adds a warning marker when non-manual trigger is present with elasticsearch.request step', async () => {
    mockCurrentData = {
      version: '1',
      name: 't',
      triggers: [{ type: 'triggers.elastic.schedule', cron: '* * * * *' }],
      steps: [
        {
          name: 'es',
          type: 'elasticsearch.request',
          with: { method: 'GET', path: '/_cluster/health' },
        },
      ],
    };

    await act(async () => {
      render(<Harness text={'dummy'} />);
    });

    await waitFor(() => {
      expect(setModelMarkersSpy).toHaveBeenCalled();
    });
    const lastCall = setModelMarkersSpy.mock.calls[setModelMarkersSpy.mock.calls.length - 1];
    const markers = lastCall?.[2] as Array<{ message: string; source?: string }>;
    expect(markers?.some((m) => m.source === 'api-steps-manual-only')).toBe(true);
    expect(markers?.some((m) => m.message.includes('API steps are manual-only'))).toBe(true);
  });

  it('does not add the warning when only manual trigger is present', async () => {
    mockCurrentData = {
      version: '1',
      name: 't',
      triggers: [{ type: 'triggers.elastic.manual' }],
      steps: [
        {
          name: 'es',
          type: 'elasticsearch.request',
          with: { method: 'GET', path: '/_cluster/health' },
        },
      ],
    };

    await act(async () => {
      render(<Harness text={'dummy'} />);
    });

    await waitFor(() => {
      expect(setModelMarkersSpy).toHaveBeenCalled();
    });
    const lastCall = setModelMarkersSpy.mock.calls[setModelMarkersSpy.mock.calls.length - 1];
    const markers = lastCall?.[2] as Array<{ source?: string }>;
    expect(markers?.some((m) => m.source === 'api-steps-manual-only')).toBe(false);
  });

  it('adds a warning marker for kibana.request step with non-manual trigger', async () => {
    mockCurrentData = {
      version: '1',
      name: 't',
      triggers: [{ type: 'triggers.elastic.schedule', cron: '* * * * *' }],
      steps: [
        {
          name: 'kbn',
          type: 'kibana.request',
          with: { method: 'POST', path: '/api/cases/_find' },
        },
      ],
    };

    await act(async () => {
      render(<Harness text={'dummy'} />);
    });

    await waitFor(() => {
      expect(setModelMarkersSpy).toHaveBeenCalled();
    });
    const lastCall = setModelMarkersSpy.mock.calls[setModelMarkersSpy.mock.calls.length - 1];
    const markers = lastCall?.[2] as Array<{ source?: string; message: string }>;
    expect(markers?.some((m) => m.source === 'api-steps-manual-only')).toBe(true);
    expect(markers?.some((m) => m.message.includes('API steps are manual-only'))).toBe(true);
  });
});
