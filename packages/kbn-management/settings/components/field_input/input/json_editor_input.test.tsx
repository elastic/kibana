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

const name = 'Some json field';
const id = 'some:json:field';
const initialValue = '{"foo":"bar"}';
import { wrap } from '../mocks';

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
  const onInputChange = jest.fn();
  const defaultProps: CodeEditorInputProps = {
    onInputChange,
    type: 'json',
    field: {
      name,
      type: 'json',
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

  it('calls the onInputChange prop when the object value changes', async () => {
    const { getByTestId } = render(wrap(<CodeEditorInput {...defaultProps} />));
    const input = getByTestId(`${TEST_SUBJ_PREFIX_FIELD}-${id}`);
    fireEvent.change(input, { target: { value: '{"bar":"foo"}' } });

    await waitFor(() =>
      expect(defaultProps.onInputChange).toHaveBeenCalledWith({
        type: 'json',
        unsavedValue: '{"bar":"foo"}',
      })
    );
  });

  it('calls the onInputChange prop when the object value changes with no value', async () => {
    const { getByTestId } = render(wrap(<CodeEditorInput {...defaultProps} />));
    const input = getByTestId(`${TEST_SUBJ_PREFIX_FIELD}-${id}`);
    fireEvent.change(input, { target: { value: '' } });

    await waitFor(() =>
      expect(defaultProps.onInputChange).toHaveBeenCalledWith({ type: 'json', unsavedValue: '' })
    );
  });

  it('calls the onInputChange prop with an error when the object value changes to invalid JSON', async () => {
    const { getByTestId } = render(wrap(<CodeEditorInput {...defaultProps} />));
    const input = getByTestId(`${TEST_SUBJ_PREFIX_FIELD}-${id}`);
    fireEvent.change(input, { target: { value: '{"bar" "foo"}' } });

    await waitFor(() =>
      expect(defaultProps.onInputChange).toHaveBeenCalledWith({
        type: 'json',
        unsavedValue: '{"bar" "foo"}',
        error: 'Invalid JSON syntax',
        isInvalid: true,
      })
    );
  });

  it('calls the onInputChange prop when the array value changes', async () => {
    const props = { ...defaultProps, defaultValue: '["bar", "foo"]', value: undefined };
    const { getByTestId } = render(wrap(<CodeEditorInput {...props} />));
    const input = getByTestId(`${TEST_SUBJ_PREFIX_FIELD}-${id}`);
    fireEvent.change(input, { target: { value: '["foo", "bar", "baz"]' } });

    await waitFor(() =>
      expect(defaultProps.onInputChange).toHaveBeenCalledWith({
        type: 'json',
        unsavedValue: '["foo", "bar", "baz"]',
      })
    );
  });

  it('calls the onInputChange prop when the array value changes with no value', async () => {
    const props = {
      ...defaultProps,
      defaultValue: '["bar", "foo"]',
      value: '["bar", "foo"]',
    };
    const { getByTestId } = render(wrap(<CodeEditorInput {...props} />));
    const input = getByTestId(`${TEST_SUBJ_PREFIX_FIELD}-${id}`);
    fireEvent.change(input, { target: { value: '' } });

    await waitFor(() =>
      expect(defaultProps.onInputChange).toHaveBeenCalledWith({ type: 'json', unsavedValue: '' })
    );
  });

  it('calls the onInputChange prop with an array when the array value changes to invalid JSON', async () => {
    const props = { ...defaultProps, defaultValue: '["bar", "foo"]', value: undefined };
    const { getByTestId } = render(wrap(<CodeEditorInput {...props} />));
    const input = getByTestId(`${TEST_SUBJ_PREFIX_FIELD}-${id}`);
    fireEvent.change(input, { target: { value: '["bar", "foo" | "baz"]' } });

    await waitFor(() =>
      expect(defaultProps.onInputChange).toHaveBeenCalledWith({
        type: 'json',
        unsavedValue: '["bar", "foo" | "baz"]',
        error: 'Invalid JSON syntax',
        isInvalid: true,
      })
    );
  });
});
