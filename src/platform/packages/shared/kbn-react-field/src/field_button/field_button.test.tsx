/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FieldButton, FieldButtonProps } from './field_button';

const noop = () => {};

const commonProps: FieldButtonProps = {
  size: 's',
  onClick: noop,
  fieldName: 'name',
};

describe('FieldButton', () => {
  it('renders drag handle if passed', () => {
    render(<FieldButton {...commonProps} dragHandle={<span>drag</span>} />);

    expect(screen.getByTestId('kbnFieldButton_dragHandle')).toBeInTheDocument();
    expect(screen.getByText('drag')).toBeInTheDocument();
  });

  it('renders field icon if passed', () => {
    render(
      <FieldButton {...commonProps} fieldIcon={<span data-testid="field-icon">fieldIcon</span>} />
    );

    expect(screen.getByTestId('kbnFieldButton_fieldIcon')).toBeInTheDocument();
    expect(screen.getByText('fieldIcon')).toBeInTheDocument();
  });

  it('renders field action if passed', () => {
    render(<FieldButton {...commonProps} fieldAction={<span>fieldAction</span>} />);

    expect(screen.getByTestId('kbnFieldButton_fieldAction')).toBeInTheDocument();
    expect(screen.getByText('fieldAction')).toBeInTheDocument();
  });

  it('defaults isActive to false', () => {
    render(<FieldButton {...commonProps} />);

    const wrapper = screen.getByRole('button').closest('.kbnFieldButton');
    expect(wrapper).not.toHaveClass('kbnFieldButton-isActive');
  });

  it('applies isActive class when true', () => {
    render(<FieldButton {...commonProps} isActive />);

    const wrapper = screen.getByRole('button').closest('.kbnFieldButton');
    expect(wrapper).toHaveClass('kbnFieldButtonIsActive');
  });

  it('calls onClick when button is clicked', async () => {
    const mockOnClick = jest.fn();
    render(<FieldButton {...commonProps} onClick={mockOnClick} />);

    const button = screen.getByRole('button');
    await userEvent.click(button);

    expect(mockOnClick).toHaveBeenCalledTimes(1);
  });

  it('renders as div when no onClick is provided', () => {
    render(<FieldButton size="s" fieldName="name" />);

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.getByText('name')).toBeInTheDocument();
  });
});
