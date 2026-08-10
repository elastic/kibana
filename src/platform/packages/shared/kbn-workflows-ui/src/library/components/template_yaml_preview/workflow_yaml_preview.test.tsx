/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { WorkflowYamlPreview } from './workflow_yaml_preview';
import { WorkflowsUiServicesProvider } from '../../../context';
import { createMockWorkflowsUiServices } from '../../../context/__mocks__/mocks';

jest.mock('../../../hooks/use_workflows_monaco_theme', () => ({
  useWorkflowsMonacoTheme: jest.fn(),
  WORKFLOWS_MONACO_EDITOR_THEME: 'test-theme',
}));

jest.mock('@kbn/monaco', () => ({
  monaco: {
    editor: { TrackedRangeStickiness: { NeverGrowsWhenTypingAtEdges: 0 } },
  },
}));

const mockGetTypeIconDataUrl = jest.fn(
  async (_params: { type: string; kind: string }) => 'data:image/svg+xml;base64,AAA'
);
jest.mock('./get_type_icon_data_url', () => ({
  getTypeIconDataUrl: (params: { type: string; kind: string }) => mockGetTypeIconDataUrl(params),
}));

const mockCreateDecorationsCollection = jest.fn((_decorations: unknown[]) => ({
  clear: jest.fn(),
}));

// Mock CodeEditor: renders the value and invokes editorDidMount with a fake
// editor whose model is derived from the value, so decoration logic runs.
jest.mock('@kbn/code-editor', () => {
  const createFakeModel = (text: string) => {
    const lines = text.split('\n');
    return {
      getValue: () => text,
      getPositionAt: (offset: number) => {
        let remaining = offset;
        for (let index = 0; index < lines.length; index++) {
          if (remaining <= lines[index].length) {
            return { lineNumber: index + 1, column: remaining + 1 };
          }
          remaining -= lines[index].length + 1;
        }
        return { lineNumber: lines.length, column: 1 };
      },
      getLineContent: (lineNumber: number) => lines[lineNumber - 1] ?? '',
    };
  };
  return {
    CodeEditor: ({ value, editorDidMount, dataTestSubj }: any) => {
      const { useEffect: useEffectImpl } = jest.requireActual('react');
      useEffectImpl(() => {
        const model = createFakeModel(value);
        editorDidMount({
          getModel: () => model,
          createDecorationsCollection: mockCreateDecorationsCollection,
        });
      }, [value, editorDidMount]);
      return (
        <div data-test-subj={dataTestSubj}>
          <span data-test-subj="previewValue">{value}</span>
        </div>
      );
    },
    monaco: { editor: {} },
  };
});

const YAML = `triggers:
  - type: manual
steps:
  - name: notify
    type: slack.sendMessage
    connector-id: <slack-connector>
`;

const renderPreview = (yaml = YAML) =>
  render(
    <WorkflowsUiServicesProvider services={createMockWorkflowsUiServices()}>
      <WorkflowYamlPreview yaml={yaml} />
    </WorkflowsUiServicesProvider>
  );

describe('WorkflowYamlPreview', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render the read-only editor with the provided YAML', () => {
    renderPreview();
    expect(screen.getByTestId('workflowYamlPreview')).toBeInTheDocument();
    expect(screen.getByTestId('previewValue')).toHaveTextContent('type: slack.sendMessage');
  });

  it('should apply inline decorations for each step and trigger type', () => {
    renderPreview();
    expect(mockCreateDecorationsCollection).toHaveBeenCalledTimes(1);
    const decorations = mockCreateDecorationsCollection.mock.calls[0][0] as unknown[];
    // one trigger (manual) + one step (slack.sendMessage)
    expect(decorations).toHaveLength(2);
  });

  it('should resolve an icon for each distinct type', async () => {
    renderPreview();
    await waitFor(() => {
      expect(mockGetTypeIconDataUrl).toHaveBeenCalledTimes(2);
    });
    const kinds = mockGetTypeIconDataUrl.mock.calls.map((call) => call[0].kind);
    expect(kinds).toEqual(expect.arrayContaining(['step', 'trigger']));
  });

  it('should render nothing extra when the YAML has no step or trigger types', () => {
    renderPreview('consts:\n  foo: bar\n');
    expect(mockCreateDecorationsCollection).not.toHaveBeenCalled();
  });
});
