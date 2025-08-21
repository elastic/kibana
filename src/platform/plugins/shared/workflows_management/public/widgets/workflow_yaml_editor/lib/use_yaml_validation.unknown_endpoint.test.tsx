/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect } from 'react';
import { render, waitFor } from '@testing-library/react';
import { monaco } from '@kbn/monaco';
import { WORKFLOW_ZOD_SCHEMA_LOOSE } from '../../../../common/schema';
import { useYamlValidation } from './use_yaml_validation';

jest.mock('../../../../common/lib/yaml_utils', () => ({
  parseWorkflowYamlToJSON: jest.fn((text: string) => {
    const hasUnknown = text.includes('/_unknown');
    const hasMustache = /path:\s*\{\{/.test(text);
    // crude extraction of method
    const methodMatch = text.match(/method:\s*(GET|POST|PUT|DELETE|PATCH|HEAD)/);
    const method = methodMatch ? methodMatch[1] : 'GET';
    const data = {
      version: '1',
      name: 't',
      triggers: [{ type: 'triggers.elastic.manual' }],
      steps: [
        {
          name: hasUnknown ? 'bad' : 'templ',
          type: 'elasticsearch.request',
          with: {
            method,
            path: hasMustache ? '{{ some.var }}' : hasUnknown ? '/_unknown' : '/_search',
          },
        },
      ],
    } as any;
    return { success: true, data };
  }),
  getCurrentPath: jest.fn(() => []),
}));

jest.mock('../../../entities/workflows/lib/get_workflow_graph', () => ({
  getWorkflowGraph: jest.fn(() => ({})),
}));

jest.mock('../../../features/workflow_context/lib/get_context_for_path', () => ({
  getContextForPath: jest.fn(() => ({})),
}));

jest.mock('./console_specs/indexer', () => ({
  getOrBuildEndpointIndex: jest.fn(async () => {
    const idx = new Map();
    idx.set('search', { methods: ['GET', 'POST'], patterns: ['/_search', '/{index}/_search'] });
    return idx;
  }),
  findEndpointByMethodAndPath:
    jest.requireActual('./console_specs/indexer').findEndpointByMethodAndPath,
}));

function ensureMonacoMocks() {
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

function Harness({ text, http }: { text: string; http: any }) {
  const { validateVariables } = useYamlValidation({
    workflowYamlSchema: WORKFLOW_ZOD_SCHEMA_LOOSE,
    http,
  });

  useEffect(() => {
    ensureMonacoMocks();
    const editor = createMockEditor(text);
    (async () => {
      await validateVariables(editor);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  return null;
}

describe('unknown endpoint validation', () => {
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

  it('adds a non-blocking warning when method+path do not match known endpoints', async () => {
    const text = `
version: '1'
name: t
triggers:
  - type: triggers.elastic.manual
steps:
  - name: bad
    type: elasticsearch.request
    with:
      method: GET
      path: /_unknown
`;

    render(<Harness text={text} http={{}} />);

    await waitFor(() => expect(setModelMarkersSpy).toHaveBeenCalled());

    const lastCall = (setModelMarkersSpy as any).mock.calls[
      (setModelMarkersSpy as any).mock.calls.length - 1
    ];
    const markers = lastCall?.[2] as Array<{ source?: string; message: string }>;
    expect(markers.some((m) => m.source === 'es-api-unknown-endpoint')).toBe(true);
    expect(markers.some((m) => m.message.includes('Unknown Elasticsearch endpoint'))).toBe(true);
  });

  it('skips unknown-endpoint warning when path contains mustache', async () => {
    const text = `
version: '1'
name: t
triggers:
  - type: triggers.elastic.manual
steps:
  - name: templ
    type: elasticsearch.request
    with:
      method: GET
      path: {{ some.var }}
`;

    render(<Harness text={text} http={{}} />);

    await waitFor(() => expect(setModelMarkersSpy).toHaveBeenCalled());

    const lastCall = (setModelMarkersSpy as any).mock.calls[
      (setModelMarkersSpy as any).mock.calls.length - 1
    ];
    const markers = lastCall?.[2] as Array<{ source?: string; message: string }>;
    expect(markers.some((m) => m.source === 'es-api-unknown-endpoint')).toBe(false);
  });
});
