/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';

import { CodeEditorInput, CodeEditorInputProps } from './code_editor_input';
import { TEST_SUBJ_PREFIX_FIELD } from '.';
import { CodeEditorProps } from '../code_editor';
import { wrap } from '../mocks';

const name = 'Some markdown field';
const id = 'some:markdown:field';
const initialValue = '# A Markdown Title';

jest.mock('../code_editor', () => ({
  CodeEditor: ({ value, onChange }: CodeEditorProps) => (
    <input
      data-test-subj="management-settings-editField-some:markdown:field"
      type="text"
      value={String(value)}
      onChange={(e) => {
        if (onChange) {
          onChange(e.target.value, e as any);
        }
      }}
    />
  ),
}));

describe('MarkdownEditorInput', () => {
  const onInputChange = jest.fn();
  const defaultProps: CodeEditorInputProps = {
    onInputChange,
    type: 'markdown',
    field: {
      name,
      type: 'markdown',
      ariaAttributes: {
        ariaLabel: name,
      },
      id,
      isOverridden: false,
      defaultValue: initialValue,
    },
    isSavingEnabled: true,
  };

  beforeEach(() => {
    onInputChange.mockClear();
  });

  it('renders without errors', () => {
    const { container } = render(wrap(<CodeEditorInput {...defaultProps} />));
    expect(container).toBeInTheDocument();
  });

  it('renders the value prop', () => {
    const { getByTestId } = render(wrap(<CodeEditorInput {...defaultProps} />));
    const input = getByTestId(`${TEST_SUBJ_PREFIX_FIELD}-${id}`);
    expect(input).toHaveValue(initialValue);
  });

  it('calls the onInputChange prop when the value changes', async () => {
    const { getByTestId } = render(wrap(<CodeEditorInput {...defaultProps} />));
    const input = getByTestId(`${TEST_SUBJ_PREFIX_FIELD}-${id}`);
    fireEvent.change(input, { target: { value: '# New Markdown Title' } });

    await waitFor(() => {
      expect(defaultProps.onInputChange).not.toHaveBeenCalledWith({
        error: expect.any(String),
      });

      expect(defaultProps.onInputChange).toHaveBeenCalledWith({
        type: 'markdown',
        unsavedValue: '# New Markdown Title',
      });
    });
  });
});
