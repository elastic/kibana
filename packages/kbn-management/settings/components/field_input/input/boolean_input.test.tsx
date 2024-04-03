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
import { InputProps } from '../types';

const name = 'Some boolean field';
const id = 'some:boolean:field';

describe('BooleanInput', () => {
  const onInputChange = jest.fn();
  const defaultProps: InputProps<'boolean'> = {
    onInputChange,
    field: {
      name,
      type: 'boolean',
      ariaAttributes: {
        ariaLabel: name,
      },
      id,
      isOverridden: false,
      defaultValue: false,
    },
    isSavingEnabled: true,
  };

  beforeEach(() => {
    onInputChange.mockClear();
  });

  it('renders false', () => {
    render(wrap(<BooleanInput {...defaultProps} />));
    expect(screen.getByTestId(`${TEST_SUBJ_PREFIX_FIELD}-${id}`)).not.toBeChecked();
  });

  it('renders true', () => {
    render(
      wrap(<BooleanInput {...defaultProps} field={{ ...defaultProps.field, defaultValue: true }} />)
    );
    expect(screen.getByTestId(`${TEST_SUBJ_PREFIX_FIELD}-${id}`)).toBeChecked();
  });

  it('renders unsaved value if present', () => {
    render(
      wrap(
        <BooleanInput {...defaultProps} unsavedChange={{ type: 'boolean', unsavedValue: true }} />
      )
    );
    expect(screen.getByTestId(`${TEST_SUBJ_PREFIX_FIELD}-${id}`)).toBeChecked();
  });

  it('calls onInputChange when toggled', () => {
    render(wrap(<BooleanInput {...defaultProps} />));
    const input = screen.getByTestId(`${TEST_SUBJ_PREFIX_FIELD}-${id}`);
    expect(defaultProps.onInputChange).not.toHaveBeenCalled();

    act(() => {
      fireEvent.click(input);
    });

    expect(defaultProps.onInputChange).toBeCalledWith({ type: 'boolean', unsavedValue: true });

    act(() => {
      fireEvent.click(input);
    });
  });
});
