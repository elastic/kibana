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
import type { FieldErrors } from 'react-hook-form';
import type { FormValues } from '../form/types';
import { ErrorCallOut } from './error_callout';

describe('ErrorCallOut', () => {
  const createErrors = (
    errorMap: Partial<Record<keyof FormValues, { message?: string }>>
  ): FieldErrors<FormValues> => {
    return errorMap as FieldErrors<FormValues>;
  };

  describe('when form is not submitted', () => {
    it('returns null even when there are errors', () => {
      const errors = createErrors({
        name: { message: 'Name is required' },
      });

      const { container } = render(<ErrorCallOut errors={errors} isSubmitted={false} />);

      expect(container.firstChild).toBeNull();
    });
  });

  describe('when form is submitted', () => {
    it('returns null when there are no errors', () => {
      const { container } = render(<ErrorCallOut errors={{}} isSubmitted={true} />);

      expect(container.firstChild).toBeNull();
    });

    it('displays the error callout with a single error message', () => {
      const errors = createErrors({
        name: { message: 'Name is required' },
      });

      render(<ErrorCallOut errors={errors} isSubmitted={true} />);

      expect(screen.getByText('Please address the highlighted errors.')).toBeInTheDocument();
      expect(screen.getByText('Name is required')).toBeInTheDocument();
    });

    it('displays multiple error messages', () => {
      const errors = createErrors({
        name: { message: 'Name is required' },
        query: { message: 'Query is invalid' },
        timeField: { message: 'Time field is required' },
      });

      render(<ErrorCallOut errors={errors} isSubmitted={true} />);

      expect(screen.getByText('Name is required')).toBeInTheDocument();
      expect(screen.getByText('Query is invalid')).toBeInTheDocument();
      expect(screen.getByText('Time field is required')).toBeInTheDocument();
    });

    it('filters out errors without messages', () => {
      const errors = createErrors({
        name: { message: 'Name is required' },
        query: { message: undefined },
        timeField: { message: '' },
      });

      render(<ErrorCallOut errors={errors} isSubmitted={true} />);

      expect(screen.getByText('Name is required')).toBeInTheDocument();
      expect(screen.queryByText('')).not.toBeInTheDocument();

      // Should only have one list item
      const listItems = screen.getAllByRole('listitem');
      expect(listItems).toHaveLength(1);
    });

    it('renders the callout with danger color', () => {
      const errors = createErrors({
        name: { message: 'Name is required' },
      });

      render(<ErrorCallOut errors={errors} isSubmitted={true} />);

      const callout = screen.getByRole('complementary');
      expect(callout).toHaveClass('euiCallOut--danger');
    });
  });
});
