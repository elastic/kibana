/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import type { WorkflowListItemDto } from '@kbn/workflows';
import { ExportReferencesModal } from './export_references_modal';

const makeMissingWorkflow = (id: string, name: string): WorkflowListItemDto =>
  ({ id, name } as WorkflowListItemDto);

describe('ExportReferencesModal', () => {
  const mockOnIgnore = jest.fn();
  const mockOnAddDirect = jest.fn();
  const mockOnAddAll = jest.fn();
  const mockOnCancel = jest.fn();

  const missingWorkflows = [
    makeMissingWorkflow('ref-1', 'Referenced Workflow 1'),
    makeMissingWorkflow('ref-2', 'Referenced Workflow 2'),
  ];

  const defaultProps = {
    missingWorkflows,
    onIgnore: mockOnIgnore,
    onAddDirect: mockOnAddDirect,
    onAddAll: mockOnAddAll,
    onCancel: mockOnCancel,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render the modal with title and description', () => {
    renderWithI18n(<ExportReferencesModal {...defaultProps} />);

    expect(screen.getByTestId('export-references-modal')).toBeInTheDocument();
    expect(screen.getByText('Referenced workflows not included')).toBeInTheDocument();
  });

  it('should list all missing workflows', () => {
    renderWithI18n(<ExportReferencesModal {...defaultProps} />);

    expect(screen.getByText('Referenced Workflow 1')).toBeInTheDocument();
    expect(screen.getByText('Referenced Workflow 2')).toBeInTheDocument();
  });

  it('should render all action buttons', () => {
    renderWithI18n(<ExportReferencesModal {...defaultProps} />);

    expect(screen.getByTestId('export-references-cancel')).toBeInTheDocument();
    expect(screen.getByTestId('export-references-ignore')).toBeInTheDocument();
    expect(screen.getByTestId('export-references-add-direct')).toBeInTheDocument();
    expect(screen.getByTestId('export-references-add-all')).toBeInTheDocument();
  });

  it('should call onIgnore when Ignore is clicked', async () => {
    renderWithI18n(<ExportReferencesModal {...defaultProps} />);
    await userEvent.click(screen.getByTestId('export-references-ignore'));
    expect(mockOnIgnore).toHaveBeenCalledTimes(1);
  });

  it('should call onAddDirect when Add referenced is clicked', async () => {
    renderWithI18n(<ExportReferencesModal {...defaultProps} />);
    await userEvent.click(screen.getByTestId('export-references-add-direct'));
    expect(mockOnAddDirect).toHaveBeenCalledTimes(1);
  });

  it('should call onAddAll when Add all referenced is clicked', async () => {
    renderWithI18n(<ExportReferencesModal {...defaultProps} />);
    await userEvent.click(screen.getByTestId('export-references-add-all'));
    expect(mockOnAddAll).toHaveBeenCalledTimes(1);
  });

  it('should call onCancel when Cancel is clicked', async () => {
    renderWithI18n(<ExportReferencesModal {...defaultProps} />);
    await userEvent.click(screen.getByTestId('export-references-cancel'));
    expect(mockOnCancel).toHaveBeenCalledTimes(1);
  });
});
