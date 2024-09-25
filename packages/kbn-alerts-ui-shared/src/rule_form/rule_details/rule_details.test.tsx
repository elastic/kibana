/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RuleDetails } from './rule_details';

const mockOnChange = jest.fn();

jest.mock('../hooks', () => ({
  useRuleFormState: jest.fn(),
  useRuleFormDispatch: jest.fn(),
}));

const { useRuleFormState, useRuleFormDispatch } = jest.requireMock('../hooks');

describe('RuleDetails', () => {
  beforeEach(() => {
    useRuleFormState.mockReturnValue({
      formData: {
        name: 'test',
        tags: [],
      },
    });
    useRuleFormDispatch.mockReturnValue(mockOnChange);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  test('Renders correctly', () => {
    render(<RuleDetails />);

    expect(screen.getByTestId('ruleDetails')).toBeInTheDocument();
  });

  test('Should allow name to be changed', () => {
    render(<RuleDetails />);

    fireEvent.change(screen.getByTestId('ruleDetailsNameInput'), { target: { value: 'hello' } });
    expect(mockOnChange).toHaveBeenCalledWith({
      type: 'setName',
      payload: 'hello',
    });
  });

  test('Should allow tags to be changed', async () => {
    render(<RuleDetails />);

    await userEvent.type(screen.getByTestId('comboBoxInput'), 'tag{enter}');
    expect(mockOnChange).toHaveBeenCalledWith({
      type: 'setTags',
      payload: ['tag'],
    });
  });

  test('Should display error', () => {
    useRuleFormState.mockReturnValue({
      formData: {
        name: 'test',
        tags: [],
      },
      baseErrors: {
        name: 'name is invalid',
        tags: 'tags is invalid',
      },
    });
    render(<RuleDetails />);

    expect(screen.getByText('name is invalid')).toBeInTheDocument();
    expect(screen.getByText('tags is invalid')).toBeInTheDocument();
  });
});
