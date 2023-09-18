/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';

import { BooleanInput } from './boolean_input';
import { TEST_SUBJ_PREFIX_FIELD } from '.';

import { wrap } from '../mocks';

const name = 'Some boolean field';
const id = 'some:boolean:field';

describe('BooleanInput', () => {
  const defaultProps = {
    id,
    name,
    ariaLabel: name,
    onChange: jest.fn(),
  };

  beforeEach(() => {
    defaultProps.onChange.mockClear();
  });

  it('renders true', () => {
    render(wrap(<BooleanInput value={true} {...defaultProps} />));
    expect(screen.getByTestId(`${TEST_SUBJ_PREFIX_FIELD}-${id}`)).toBeChecked();
  });

  it('renders false', () => {
    render(wrap(<BooleanInput value={false} {...defaultProps} />));
    expect(screen.getByTestId(`${TEST_SUBJ_PREFIX_FIELD}-${id}`)).not.toBeChecked();
  });

  it('calls onChange when toggled', () => {
    render(wrap(<BooleanInput value={true} {...defaultProps} />));
    const input = screen.getByTestId(`${TEST_SUBJ_PREFIX_FIELD}-${id}`);
    expect(defaultProps.onChange).not.toHaveBeenCalled();

    act(() => {
      fireEvent.click(input);
    });

    expect(defaultProps.onChange).toBeCalledWith({ value: false });

    act(() => {
      fireEvent.click(input);
    });
  });
});
