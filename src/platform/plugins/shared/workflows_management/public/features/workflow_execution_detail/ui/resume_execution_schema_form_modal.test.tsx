/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { I18nProvider } from '@kbn/i18n-react';
import type { ResumeExecutionSchemaFormModalProps } from './resume_execution_schema_form_modal';
import { ResumeExecutionSchemaFormModal } from './resume_execution_schema_form_modal';

const booleanSchema = {
  type: 'object',
  properties: {
    approved: { type: 'boolean', title: 'Approve action' },
  },
  required: ['approved'],
} as never;

const stringSchema = {
  type: 'object',
  properties: {
    reason: { type: 'string', title: 'Reason', default: 'n/a' },
  },
  required: ['reason'],
} as never;

const renderModal = (props: Partial<ResumeExecutionSchemaFormModalProps> = {}) => {
  const defaultProps: ResumeExecutionSchemaFormModalProps = {
    onClose: jest.fn(),
    onSubmit: jest.fn(),
    schema: booleanSchema,
  };
  return render(<ResumeExecutionSchemaFormModal {...defaultProps} {...props} />, {
    wrapper: I18nProvider,
  });
};

describe('ResumeExecutionSchemaFormModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders the modal with "Provide action" title', () => {
      renderModal();
      expect(screen.getByTestId('workflowResumeExecutionSchemaFormModal')).toBeInTheDocument();
      expect(screen.getByText('Provide action')).toBeInTheDocument();
    });

    it('renders the Submit button', () => {
      renderModal();
      expect(screen.getByTestId('workflowSubmitResume')).toBeInTheDocument();
      expect(screen.getByText('Submit')).toBeInTheDocument();
    });

    it('renders the default description when no resumeMessage is provided', () => {
      renderModal();
      expect(screen.getByText('Provide input to resume the workflow.')).toBeInTheDocument();
    });

    it('renders the custom resumeMessage when provided', () => {
      renderModal({ resumeMessage: 'Please approve this action' });
      expect(screen.getByText('Please approve this action')).toBeInTheDocument();
    });

    it('renders the boolean toggle for a boolean schema property', () => {
      renderModal();
      expect(screen.getByRole('switch')).toBeInTheDocument();
    });

    it('seeds the string field with its default value', () => {
      renderModal({ schema: stringSchema });
      expect(screen.getByRole('textbox', { name: /Reason/i })).toHaveValue('n/a');
    });
  });

  describe('validation', () => {
    it('shows a required-field error when a required string field is cleared and Submit is clicked', () => {
      renderModal({ schema: stringSchema });
      const input = screen.getByRole('textbox', { name: /Reason/i });
      fireEvent.change(input, { target: { value: '' } });
      fireEvent.click(screen.getByTestId('workflowSubmitResume'));
      expect(screen.getByText('This field is required')).toBeInTheDocument();
    });

    it('does not call onSubmit when required fields have errors', () => {
      const onSubmit = jest.fn();
      renderModal({ onSubmit, schema: stringSchema });
      const input = screen.getByRole('textbox', { name: /Reason/i });
      fireEvent.change(input, { target: { value: '' } });
      fireEvent.click(screen.getByTestId('workflowSubmitResume'));
      expect(onSubmit).not.toHaveBeenCalled();
    });
  });

  describe('submit', () => {
    it('calls onSubmit with the current field values', () => {
      const onSubmit = jest.fn();
      renderModal({ onSubmit });
      fireEvent.click(screen.getByRole('switch'));
      fireEvent.click(screen.getByTestId('workflowSubmitResume'));
      expect(onSubmit).toHaveBeenCalledWith({ stepInputs: { approved: true } });
    });

    it('calls onSubmit with default seeded values when no fields are changed', () => {
      const onSubmit = jest.fn();
      renderModal({ onSubmit, schema: stringSchema });
      fireEvent.click(screen.getByTestId('workflowSubmitResume'));
      expect(onSubmit).toHaveBeenCalledWith({ stepInputs: { reason: 'n/a' } });
    });

    it('includes expectedResumeSeq in onSubmit payload when prop is provided', () => {
      const onSubmit = jest.fn();
      renderModal({ expectedResumeSeq: 3, onSubmit, schema: stringSchema });
      fireEvent.click(screen.getByTestId('workflowSubmitResume'));
      expect(onSubmit).toHaveBeenCalledWith({
        expectedResumeSeq: 3,
        stepInputs: { reason: 'n/a' },
      });
    });

    it('omits expectedResumeSeq from onSubmit payload when prop is not provided', () => {
      const onSubmit = jest.fn();
      renderModal({ onSubmit, schema: stringSchema });
      fireEvent.click(screen.getByTestId('workflowSubmitResume'));
      const [callArg] = onSubmit.mock.calls[0];
      expect(callArg).not.toHaveProperty('expectedResumeSeq');
    });
  });

  describe('isSubmitting', () => {
    it('disables the Submit button when isSubmitting is true', () => {
      renderModal({ isSubmitting: true });
      expect(screen.getByTestId('workflowSubmitResume')).toBeDisabled();
    });
  });

  describe('onClose', () => {
    it('calls onClose when the modal close button is clicked', () => {
      const onClose = jest.fn();
      renderModal({ onClose });
      fireEvent.click(screen.getByLabelText('Closes this modal window'));
      expect(onClose).toHaveBeenCalled();
    });
  });
});
