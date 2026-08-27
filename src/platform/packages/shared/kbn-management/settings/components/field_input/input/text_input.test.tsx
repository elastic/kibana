/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react';
import type { ValueValidation } from '@kbn/core-ui-settings-browser/src/types';

import type { TextInputProps } from './text_input';
import { TextInput } from './text_input';
import { TEST_SUBJ_PREFIX_FIELD } from '.';
import { wrap, createFieldInputServicesMock } from '../mocks';

const name = 'Some text field';
const id = 'some:text:field';

describe('TextInput', () => {
  const onInputChange = jest.fn();
  const defaultProps: TextInputProps = {
    onInputChange,
    field: {
      name,
      type: 'string',
      ariaAttributes: {
        ariaLabel: name,
      },
      id,
      isOverridden: false,
      defaultValue: 'initial value',
    },
    isSavingEnabled: true,
  };

  beforeEach(() => {
    onInputChange.mockClear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders without errors', () => {
    const { container } = render(wrap(<TextInput {...defaultProps} />));
    expect(container).toBeInTheDocument();
  });

  it('renders the value prop', () => {
    const { getByTestId } = render(wrap(<TextInput {...defaultProps} />));
    const input = getByTestId(`${TEST_SUBJ_PREFIX_FIELD}-${id}`);
    expect(input).toHaveValue('initial value');
  });

  it('calls the onInputChange prop when the value changes', () => {
    const { getByTestId } = render(wrap(<TextInput {...defaultProps} />));
    const input = getByTestId(`${TEST_SUBJ_PREFIX_FIELD}-${id}`);
    fireEvent.change(input, { target: { value: 'new value' } });

    expect(defaultProps.onInputChange).toHaveBeenCalledWith({
      type: 'string',
      unsavedValue: 'new value',
    });
  });

  it('calls the onInputChange prop with an error when the value fails validation', async () => {
    const services = createFieldInputServicesMock();
    services.validateChange = jest.fn().mockResolvedValue({
      successfulValidation: true,
      valid: false,
      errorMessage: 'Invalid value',
    });

    const { getByTestId } = render(wrap(<TextInput {...defaultProps} />, services));
    const input = getByTestId(`${TEST_SUBJ_PREFIX_FIELD}-${id}`);
    fireEvent.change(input, { target: { value: 'invalid value' } });

    await waitFor(() =>
      expect(defaultProps.onInputChange).toHaveBeenCalledWith({
        type: 'string',
        unsavedValue: 'invalid value',
        isInvalid: true,
        error: 'Invalid value',
      })
    );
  });

  it('ignores an out-of-order validation response for a stale value', async () => {
    jest.useFakeTimers();

    const resolvers: Array<(value: ValueValidation) => void> = [];
    const services = createFieldInputServicesMock();
    services.validateChange = jest
      .fn()
      .mockImplementation(() => new Promise<ValueValidation>((resolve) => resolvers.push(resolve)));

    const { getByTestId } = render(wrap(<TextInput {...defaultProps} />, services));
    const input = getByTestId(`${TEST_SUBJ_PREFIX_FIELD}-${id}`);

    // First edit: its validation is requested but will resolve last (out of order).
    fireEvent.change(input, { target: { value: 'first' } });
    act(() => jest.advanceTimersByTime(500));

    // Second edit: its validation is requested next and will resolve first.
    fireEvent.change(input, { target: { value: 'second' } });
    act(() => jest.advanceTimersByTime(500));

    expect(services.validateChange).toHaveBeenNthCalledWith(1, id, 'first');
    expect(services.validateChange).toHaveBeenNthCalledWith(2, id, 'second');

    onInputChange.mockClear();

    // Resolve the latest value's validation, then the stale one.
    await act(async () => {
      resolvers[1]({ successfulValidation: true, valid: false, errorMessage: 'second invalid' });
    });
    await act(async () => {
      resolvers[0]({ successfulValidation: true, valid: false, errorMessage: 'first invalid' });
    });

    // Only the latest value's result is applied; the stale response is discarded.
    expect(onInputChange).toHaveBeenCalledWith({
      type: 'string',
      unsavedValue: 'second',
      isInvalid: true,
      error: 'second invalid',
    });
    expect(onInputChange).not.toHaveBeenCalledWith({
      type: 'string',
      unsavedValue: 'first',
      isInvalid: true,
      error: 'first invalid',
    });
  });

  it('disables the input when isDisabled prop is true', () => {
    const { getByTestId } = render(wrap(<TextInput {...defaultProps} isSavingEnabled={false} />));
    const input = getByTestId(`${TEST_SUBJ_PREFIX_FIELD}-${id}`);
    expect(input).toBeDisabled();
  });
});
