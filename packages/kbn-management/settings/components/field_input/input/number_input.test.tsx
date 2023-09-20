/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { NumberInput } from './number_input';
import { TEST_SUBJ_PREFIX_FIELD } from '.';
import { wrap } from '../mocks';

const name = 'Some number field';
const id = 'some:number:field';

describe('NumberInput', () => {
  const defaultProps = {
    id,
    name,
    ariaLabel: 'Test',
    onChange: jest.fn(),
    value: 12345,
  };

  it('renders without errors', () => {
    const { container } = render(wrap(<NumberInput {...defaultProps} />));
    expect(container).toBeInTheDocument();
  });

  it('renders the value prop', () => {
    const { getByTestId } = render(wrap(<NumberInput {...defaultProps} />));
    const input = getByTestId(`${TEST_SUBJ_PREFIX_FIELD}-${id}`);
    expect(input).toHaveValue(defaultProps.value);
  });

  it('calls the onChange prop when the value changes', () => {
    const { getByTestId } = render(wrap(<NumberInput {...defaultProps} />));
    const input = getByTestId(`${TEST_SUBJ_PREFIX_FIELD}-${id}`);
    fireEvent.change(input, { target: { value: '54321' } });
    expect(defaultProps.onChange).toHaveBeenCalledWith({ value: 54321 });
  });

  it('disables the input when isDisabled prop is true', () => {
    const { getByTestId } = render(wrap(<NumberInput {...defaultProps} isDisabled />));
    const input = getByTestId(`${TEST_SUBJ_PREFIX_FIELD}-${id}`);
    expect(input).toBeDisabled();
  });

  it('recovers if value is null', () => {
    const { getByTestId } = render(wrap(<NumberInput {...defaultProps} value={null} />));
    const input = getByTestId(`${TEST_SUBJ_PREFIX_FIELD}-${id}`);
    waitFor(() => expect(input).toHaveValue(undefined));
  });
});
