/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react';

import { CodeEditorInput } from './code_editor_input';
import { TEST_SUBJ_PREFIX_FIELD } from '.';
import { CodeEditorProps } from '../code_editor';

const name = 'Some json field';
const id = 'some:json:field';
const initialValue = '# A Markdown Title';

jest.mock('../code_editor', () => ({
  CodeEditor: ({ value, onChange }: CodeEditorProps) => (
    <input
      data-test-subj="management-settings-editField-some:json:field"
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

describe('JsonEditorInput', () => {
  const defaultProps = {
    id,
    name,
    ariaLabel: 'Test',
    onChange: jest.fn(),
    value: initialValue,
    type: 'markdown' as 'markdown',
  };

  it('renders without errors', () => {
    const { container } = render(<CodeEditorInput {...defaultProps} />);
    expect(container).toBeInTheDocument();
  });

  it('renders the value prop', () => {
    const { getByTestId } = render(<CodeEditorInput {...defaultProps} />);
    const input = getByTestId(`${TEST_SUBJ_PREFIX_FIELD}-${id}`);
    expect(input).toHaveValue(initialValue);
  });

  it('calls the onChange prop when the value changes', () => {
    const { getByTestId } = render(<CodeEditorInput {...defaultProps} />);
    const input = getByTestId(`${TEST_SUBJ_PREFIX_FIELD}-${id}`);
    fireEvent.change(input, { target: { value: '# New Markdown Title' } });
    expect(defaultProps.onChange).toHaveBeenCalledWith({ value: '# New Markdown Title' });
  });
});
