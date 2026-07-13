/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@kbn/i18n-react';
import type { monaco } from '@kbn/monaco';
import { MonacoEditorOutput } from './monaco_editor_output';
import {
  useEditorReadContext,
  useOutputFilterReadContext,
  useRequestReadContext,
  useServicesContext,
} from '../../contexts';
import { copyTextToClipboard } from '../../lib/copy_text_to_clipboard';
import { useResizeCheckerUtils } from './hooks';

let mockEditorValue = '';
let mockSelectionStartLineNumber = 1;
let mockSelectionEndLineNumber = 1;

const getMockLines = () => mockEditorValue.split('\n');

const getMockPositionAt = (offset: number) => {
  const lines = getMockLines();
  let remainingOffset = offset;

  for (let index = 0; index < lines.length; index++) {
    const lineLengthWithNewLine = lines[index].length + 1;
    if (remainingOffset < lineLengthWithNewLine || index === lines.length - 1) {
      return { lineNumber: index + 1, column: remainingOffset + 1 };
    }
    remainingOffset -= lineLengthWithNewLine;
  }

  return { lineNumber: 1, column: 1 };
};

const createMockModel = (): monaco.editor.ITextModel =>
  ({
    getLineContent: (lineNumber: number) => getMockLines()[lineNumber - 1] ?? '',
    getLineCount: () => getMockLines().length,
    getLineMaxColumn: (lineNumber: number) => (getMockLines()[lineNumber - 1] ?? '').length + 1,
    getPositionAt: getMockPositionAt,
    getValue: () => mockEditorValue,
    getValueInRange: ({ startLineNumber, endLineNumber }: monaco.IRange) =>
      getMockLines()
        .slice(startLineNumber - 1, endLineNumber)
        .join('\n'),
  } as unknown as monaco.editor.ITextModel);

const mockEditor = {
  createDecorationsCollection: jest.fn(() => ({
    clear: jest.fn(),
    set: jest.fn(),
  })),
  getModel: jest.fn(createMockModel),
  getScrollTop: jest.fn(() => 0),
  getSelection: jest.fn(() => ({
    startLineNumber: mockSelectionStartLineNumber,
    endLineNumber: mockSelectionEndLineNumber,
  })),
  getTopForLineNumber: jest.fn(() => 0),
  hasTextFocus: jest.fn(() => true),
  onDidBlurEditorText: jest.fn(),
  onDidChangeCursorPosition: jest.fn(),
  onDidChangeCursorSelection: jest.fn(),
  onDidContentSizeChange: jest.fn(),
  onDidScrollChange: jest.fn(),
  setSelection: jest.fn(),
} as unknown as jest.Mocked<monaco.editor.IStandaloneCodeEditor>;

jest.mock('@kbn/code-editor', () => {
  const ReactActual = jest.requireActual('react');

  return {
    CodeEditor: (props: {
      dataTestSubj: string;
      editorDidMount: (editor: monaco.editor.IStandaloneCodeEditor) => void;
      value: string;
    }) => {
      mockEditorValue = props.value;
      ReactActual.useEffect(() => {
        props.editorDidMount(mockEditor);
      }, [props]);

      return <div data-test-subj={props.dataTestSubj}>{props.value}</div>;
    },
  };
});

jest.mock('../../contexts', () => ({
  useEditorReadContext: jest.fn(),
  useOutputFilterReadContext: jest.fn(),
  useRequestReadContext: jest.fn(),
  useServicesContext: jest.fn(),
}));

jest.mock('./hooks', () => ({
  useResizeCheckerUtils: jest.fn(),
}));

jest.mock('../../lib/copy_text_to_clipboard', () => ({
  copyTextToClipboard: jest.fn(),
}));

const mockUseEditorReadContext = useEditorReadContext as jest.MockedFunction<
  typeof useEditorReadContext
>;
const mockUseOutputFilterReadContext = useOutputFilterReadContext as jest.MockedFunction<
  typeof useOutputFilterReadContext
>;
const mockUseRequestReadContext = useRequestReadContext as jest.MockedFunction<
  typeof useRequestReadContext
>;
const mockUseServicesContext = useServicesContext as jest.MockedFunction<typeof useServicesContext>;
const mockUseResizeCheckerUtils = useResizeCheckerUtils as jest.MockedFunction<
  typeof useResizeCheckerUtils
>;
const mockCopyTextToClipboard = copyTextToClipboard as jest.MockedFunction<
  typeof copyTextToClipboard
>;

describe('WHEN rendering Console output', () => {
  const addSuccess = jest.fn();
  const addDanger = jest.fn();
  const responseValue = '{\n  "acknowledged": true\n}';

  beforeEach(() => {
    jest.clearAllMocks();
    mockEditorValue = '';
    mockSelectionStartLineNumber = 1;
    mockSelectionEndLineNumber = 1;
    mockEditor.getModel.mockImplementation(createMockModel);
    mockCopyTextToClipboard.mockResolvedValue(true);
    mockUseEditorReadContext.mockReturnValue({
      settings: {
        fontSize: 14,
        tripleQuotes: false,
        wrapMode: false,
      },
    } as any);
    mockUseOutputFilterReadContext.mockReturnValue({
      expression: '',
      invertMatch: false,
      isExpanded: false,
      mode: 'jq',
    });
    mockUseRequestReadContext.mockReturnValue({
      lastResult: {
        data: [
          {
            request: { data: '', method: 'GET', path: '/' },
            response: {
              contentType: 'application/json',
              statusCode: 200,
              statusText: 'OK',
              timeMs: 1,
              value: responseValue,
            },
          },
        ],
      },
    } as any);
    mockUseServicesContext.mockReturnValue({
      services: {
        notifications: {
          toasts: {
            addDanger,
            addSuccess,
          },
        },
      },
    } as any);
    mockUseResizeCheckerUtils.mockReturnValue({
      destroyResizeChecker: jest.fn(),
      setupResizeChecker: jest.fn(),
    });
  });

  it('SHOULD copy the selected output text to the clipboard', async () => {
    render(
      <I18nProvider>
        <MonacoEditorOutput />
      </I18nProvider>
    );

    await waitFor(() =>
      expect(screen.getByTestId('consoleMonacoOutput')).toHaveTextContent('"acknowledged": true')
    );

    await userEvent.click(screen.getByTestId('copyOutputButton'));

    await waitFor(() => expect(mockCopyTextToClipboard).toHaveBeenCalledWith(`${responseValue}\n`));
    expect(addSuccess).toHaveBeenCalled();
    expect(addDanger).not.toHaveBeenCalled();
  });

  it('SHOULD show an error when copying the selected output text fails', async () => {
    mockCopyTextToClipboard.mockResolvedValue(false);

    render(
      <I18nProvider>
        <MonacoEditorOutput />
      </I18nProvider>
    );

    await waitFor(() =>
      expect(screen.getByTestId('consoleMonacoOutput')).toHaveTextContent('"acknowledged": true')
    );

    await userEvent.click(screen.getByTestId('copyOutputButton'));

    await waitFor(() => expect(mockCopyTextToClipboard).toHaveBeenCalledWith(`${responseValue}\n`));
    expect(addSuccess).not.toHaveBeenCalled();
    expect(addDanger).toHaveBeenCalled();
  });

  it('SHOULD show an error when reading the selected output fails', async () => {
    mockEditor.getModel.mockReturnValue({
      getValue: () => {
        throw new Error('Output parsing failed');
      },
    } as unknown as monaco.editor.ITextModel);

    render(
      <I18nProvider>
        <MonacoEditorOutput />
      </I18nProvider>
    );

    await waitFor(() =>
      expect(screen.getByTestId('consoleMonacoOutput')).toHaveTextContent('"acknowledged": true')
    );

    await userEvent.click(screen.getByTestId('copyOutputButton'));

    await waitFor(() => expect(addDanger).toHaveBeenCalled());
    expect(mockCopyTextToClipboard).not.toHaveBeenCalled();
    expect(addSuccess).not.toHaveBeenCalled();
  });

  it('SHOULD show an error when the selected output is empty', async () => {
    mockCopyTextToClipboard.mockResolvedValue(false);
    mockEditor.getModel.mockReturnValue({
      getLineContent: () => '',
      getLineCount: () => 1,
      getLineMaxColumn: () => 1,
      getPositionAt: getMockPositionAt,
      getValue: () => '',
      getValueInRange: () => '',
    } as unknown as monaco.editor.ITextModel);

    render(
      <I18nProvider>
        <MonacoEditorOutput />
      </I18nProvider>
    );

    await waitFor(() =>
      expect(screen.getByTestId('consoleMonacoOutput')).toHaveTextContent('"acknowledged": true')
    );

    await userEvent.click(screen.getByTestId('copyOutputButton'));

    await waitFor(() => expect(addDanger).toHaveBeenCalled());
    expect(mockCopyTextToClipboard).toHaveBeenCalledWith('');
    expect(addSuccess).not.toHaveBeenCalled();
  });

  it('SHOULD keep the editor focused when the copy button is pressed', async () => {
    // Pressing the copy button must not blur the output editor: the editor's blur
    // handler hides the actions after 100ms, which is faster than a typical human
    // click is released, so the click would land on a hidden element and never fire.
    render(
      <I18nProvider>
        <MonacoEditorOutput />
      </I18nProvider>
    );

    await waitFor(() =>
      expect(screen.getByTestId('consoleMonacoOutput')).toHaveTextContent('"acknowledged": true')
    );

    const mouseDownEvent = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
    screen.getByTestId('copyOutputButton').dispatchEvent(mouseDownEvent);

    expect(mouseDownEvent.defaultPrevented).toBe(true);
  });

  it('SHOULD hide the actions and highlight after the copy completes', async () => {
    render(
      <I18nProvider>
        <MonacoEditorOutput />
      </I18nProvider>
    );

    await waitFor(() =>
      expect(screen.getByTestId('consoleMonacoOutput')).toHaveTextContent('"acknowledged": true')
    );

    const button = screen.getByTestId('copyOutputButton');
    await userEvent.click(button);

    await waitFor(() => expect(addSuccess).toHaveBeenCalled());
    // The floating actions container is hidden again as the completion feedback.
    const actionsContainer = button.closest('[style]') as HTMLElement;
    await waitFor(() => expect(actionsContainer.style.visibility).toBe('hidden'));
  });

  it('SHOULD hide the actions and highlight after the copy fails', async () => {
    mockCopyTextToClipboard.mockResolvedValue(false);

    render(
      <I18nProvider>
        <MonacoEditorOutput />
      </I18nProvider>
    );

    await waitFor(() =>
      expect(screen.getByTestId('consoleMonacoOutput')).toHaveTextContent('"acknowledged": true')
    );

    const button = screen.getByTestId('copyOutputButton');
    await userEvent.click(button);

    await waitFor(() => expect(addDanger).toHaveBeenCalled());
    const actionsContainer = button.closest('[style]') as HTMLElement;
    await waitFor(() => expect(actionsContainer.style.visibility).toBe('hidden'));
  });
});
