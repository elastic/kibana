/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RuleDetails } from './rule_details';

const mockOnChange = jest.fn();

describe('RuleDetails', () => {
  test('Renders correctly', () => {
    render(
      <RuleDetails
        formValues={{
          name: 'test',
          tags: [],
        }}
        onChange={mockOnChange}
      />
    );

    expect(screen.getByTestId('ruleDetails')).toBeInTheDocument();
  });

  test('Should allow name to be changed', () => {
    render(
      <RuleDetails
        formValues={{
          name: 'test',
          tags: [],
        }}
        onChange={mockOnChange}
      />
    );

    fireEvent.change(screen.getByTestId('ruleDetailsNameInput'), { target: { value: 'hello' } });
    expect(mockOnChange).toHaveBeenCalledWith('name', 'hello');
  });

  test('Should allow tags to be changed', () => {
    render(
      <RuleDetails
        formValues={{
          name: 'test',
          tags: [],
        }}
        onChange={mockOnChange}
      />
    );

    userEvent.type(screen.getByTestId('comboBoxInput'), 'tag{enter}');
    expect(mockOnChange).toHaveBeenCalledWith('tags', ['tag']);
  });

  test('Should display error', () => {
    render(
      <RuleDetails
        formValues={{
          name: 'test',
          tags: [],
        }}
        errors={{
          name: 'name is invalid',
          tags: 'tags is invalid',
        }}
        onChange={mockOnChange}
      />
    );

    expect(screen.getByText('name is invalid')).toBeInTheDocument();
    expect(screen.getByText('tags is invalid')).toBeInTheDocument();
  });
});
