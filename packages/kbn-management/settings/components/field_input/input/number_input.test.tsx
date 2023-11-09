/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react';
import { NumberInput, NumberInputProps } from './number_input';
import { TEST_SUBJ_PREFIX_FIELD } from '.';
import { wrap } from '../mocks';
import userEvent from '@testing-library/user-event';

const name = 'Some number field';
const id = 'some:number:field';

describe('NumberInput', () => {
  const onInputChange = jest.fn();
  const defaultProps: NumberInputProps = {
    onInputChange,
    field: {
      name,
      type: 'number',
      ariaAttributes: {
        ariaLabel: name,
      },
      id,
      isOverridden: false,
      defaultValue: 12345,
    },
    isSavingEnabled: true,
  };

  beforeEach(() => {
    onInputChange.mockClear();
  });

  it('renders without errors', () => {
    const { container, getByTestId } = render(wrap(<NumberInput {...defaultProps} />));
    expect(container).toBeInTheDocument();
    const input = getByTestId(`${TEST_SUBJ_PREFIX_FIELD}-${id}`);
    expect(input).toHaveValue(defaultProps.field.defaultValue);
  });

  it('renders the saved value if present', () => {
    const { getByTestId } = render(
      wrap(<NumberInput {...defaultProps} field={{ ...defaultProps.field, savedValue: 9876 }} />)
    );
    const input = getByTestId(`${TEST_SUBJ_PREFIX_FIELD}-${id}`);
    expect(input).toHaveValue(9876);
  });

  it('renders the unsaved value if present', () => {
    const { getByTestId } = render(
      wrap(
        <NumberInput
          {...defaultProps}
          field={{ ...defaultProps.field, savedValue: 9876 }}
          unsavedChange={{ type: 'number', unsavedValue: 4321 }}
        />
      )
    );
    const input = getByTestId(`${TEST_SUBJ_PREFIX_FIELD}-${id}`);
    expect(input).toHaveValue(4321);
  });

  it('only calls onInputChange when blurred', async () => {
    const { getByTestId } = render(wrap(<NumberInput {...defaultProps} />));
    const input = getByTestId(`${TEST_SUBJ_PREFIX_FIELD}-${id}`);

    fireEvent.focus(input);
    userEvent.clear(input);
    userEvent.type(input, '54321');

    expect(input).toHaveValue(54321);
    expect(defaultProps.onInputChange).not.toHaveBeenCalled();

    await act(async () => {
      await input.blur();
    });

    expect(defaultProps.onInputChange).toHaveBeenCalledWith({
      type: 'number',
      unsavedValue: 54321,
    });
  });

  it('disables the input when isDisabled prop is true', () => {
    const { getByTestId } = render(wrap(<NumberInput {...defaultProps} isSavingEnabled={false} />));
    const input = getByTestId(`${TEST_SUBJ_PREFIX_FIELD}-${id}`);
    expect(input).toBeDisabled();
  });

  it('recovers if value is null', () => {
    const { getByTestId } = render(
      wrap(<NumberInput {...defaultProps} field={{ ...defaultProps.field, defaultValue: null }} />)
    );
    const input = getByTestId(`${TEST_SUBJ_PREFIX_FIELD}-${id}`);
    waitFor(() => expect(input).toHaveValue(undefined));
  });
});
