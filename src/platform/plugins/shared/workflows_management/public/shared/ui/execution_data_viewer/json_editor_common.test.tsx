/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { render, screen } from '@testing-library/react';
import React from 'react';
import { JsonCodeEditorCommon, JSONCodeEditorCommonMemoized } from './json_editor_common';

// Mock CodeEditor
jest.mock('@kbn/code-editor', () => ({
  CodeEditor: (props: any) => (
    <div
      data-test-subj="mocked-code-editor"
      data-value={props.value}
      data-readonly={String(props.options?.readOnly ?? false)}
      data-language={props.languageId}
      aria-label={props['aria-label']}
    >
      {props.value}
    </div>
  ),
}));

// Mock useMemoCss
jest.mock('@kbn/css-utils/public/use_memo_css', () => ({
  useMemoCss: () => ({
    codeEditor: undefined,
    copyButtonContainer: undefined,
  }),
}));

// Mock theme constant
jest.mock('@kbn/workflows-ui', () => ({
  ...jest.requireActual('@kbn/workflows-ui'),
  WORKFLOWS_MONACO_EDITOR_THEME: 'workflows-theme',
}));

describe('JsonCodeEditorCommon', () => {
  const defaultProps = {
    jsonValue: '{"key": "value"}',
    onEditorDidMount: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return null when jsonValue is empty', () => {
    const { container } = render(<JsonCodeEditorCommon {...defaultProps} jsonValue="" />);

    expect(container.innerHTML).toBe('');
  });

  it('should render the code editor with the provided JSON value', () => {
    render(<JsonCodeEditorCommon {...defaultProps} />);

    const editor = screen.getByTestId('mocked-code-editor');
    expect(editor).toBeInTheDocument();
    expect(editor).toHaveAttribute('data-value', '{"key": "value"}');
  });

  it('should render with read-only mode', () => {
    render(<JsonCodeEditorCommon {...defaultProps} />);

    const editor = screen.getByTestId('mocked-code-editor');
    expect(editor).toHaveAttribute('data-readonly', 'true');
  });

  it('should render the copy to clipboard button by default', () => {
    render(<JsonCodeEditorCommon {...defaultProps} />);

    expect(screen.getByText('Copy to clipboard')).toBeInTheDocument();
  });

  it('should hide the copy button when hideCopyButton is true', () => {
    render(<JsonCodeEditorCommon {...defaultProps} hideCopyButton />);

    expect(screen.queryByText('Copy to clipboard')).not.toBeInTheDocument();
  });

  it('should render with a custom data-test-subj', () => {
    render(<JsonCodeEditorCommon {...defaultProps} data-test-subj="custom-json-editor" />);

    expect(screen.getByTestId('custom-json-editor')).toBeInTheDocument();
  });

  it('should set the JSON language on the code editor', () => {
    render(<JsonCodeEditorCommon {...defaultProps} />);

    const editor = screen.getByTestId('mocked-code-editor');
    expect(editor).toHaveAttribute('data-language', 'json');
  });
});

describe('JSONCodeEditorCommonMemoized', () => {
  it('should render the same as JsonCodeEditorCommon', () => {
    const props = {
      jsonValue: '{"memoized": true}',
      onEditorDidMount: jest.fn(),
    };

    render(<JSONCodeEditorCommonMemoized {...props} />);

    const editor = screen.getByTestId('mocked-code-editor');
    expect(editor).toBeInTheDocument();
    expect(editor).toHaveAttribute('data-value', '{"memoized": true}');
  });
});
