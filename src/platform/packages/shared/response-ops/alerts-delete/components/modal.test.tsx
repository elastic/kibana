/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { AlertDeleteModal } from './modal';
import * as i18n from '../translations';

describe('AlertDelete Modal', () => {
  const closeModalMock = jest.fn();

  beforeEach(() => {
    closeModalMock.mockClear();
  });

  it('renders the modal with initial state', () => {
    render(<AlertDeleteModal onCloseModal={closeModalMock} isVisible />);

    expect(screen.getByText(i18n.MODAL_TITLE)).toBeInTheDocument();
    expect(screen.getByText(i18n.MODAL_DESCRIPTION)).toBeInTheDocument();
    expect(screen.getByText(i18n.ACTIVE_ALERTS)).toBeInTheDocument();
    expect(screen.getByText(i18n.INACTIVE_ALERTS)).toBeInTheDocument();
    expect(screen.getByText(i18n.DELETE_CONFIRMATION)).toBeInTheDocument();
    expect(screen.getByTestId('alert-delete-active-threshold')).toBeDisabled();
    expect(screen.getByTestId('alert-delete-active-threshold-unit')).toBeDisabled();
    expect(screen.getByTestId('alert-delete-inactive-threshold')).toBeDisabled();
    expect(screen.getByTestId('alert-delete-inactive-threshold-unit')).toBeDisabled();
  });

  it('enables the active alerts threshold when the checkbox is checked', () => {
    render(<AlertDeleteModal onCloseModal={closeModalMock} isVisible />);

    const activeCheckbox = screen.getByTestId('alert-delete-active-checkbox');
    fireEvent.click(activeCheckbox);

    expect(activeCheckbox).toBeChecked();
    expect(screen.getByTestId('alert-delete-active-threshold')).not.toBeDisabled();
    expect(screen.getByTestId('alert-delete-active-threshold-unit')).not.toBeDisabled();
  });

  it('enables the inactive alerts threshold when the checkbox is checked', () => {
    render(<AlertDeleteModal onCloseModal={closeModalMock} isVisible />);

    const inactiveCheckbox = screen.getByTestId('alert-delete-inactive-checkbox');
    fireEvent.click(inactiveCheckbox);

    expect(inactiveCheckbox).toBeChecked();
    expect(screen.getByTestId('alert-delete-inactive-threshold')).not.toBeDisabled();
    expect(screen.getByTestId('alert-delete-inactive-threshold-unit')).not.toBeDisabled();
  });

  it('validates the delete confirmation input', () => {
    render(<AlertDeleteModal onCloseModal={closeModalMock} isVisible />);

    const deleteInput = screen.getByTestId('alert-delete-delete-confirmation');
    fireEvent.change(deleteInput, { target: { value: 'wrong-passkey' } });

    expect(deleteInput).toHaveValue('wrong-passkey');
    expect(screen.getByTestId('alert-delete-submit')).toBeDisabled();

    fireEvent.change(deleteInput, { target: { value: i18n.DELETE_PASSKEY } });
    expect(deleteInput).toHaveValue(i18n.DELETE_PASSKEY);

    const inactiveCheckbox = screen.getByTestId('alert-delete-inactive-checkbox');
    fireEvent.click(inactiveCheckbox);

    expect(screen.getByTestId('alert-delete-submit')).not.toBeDisabled();
  });

  it('calls closeModal when the cancel button is clicked', () => {
    render(<AlertDeleteModal onCloseModal={closeModalMock} isVisible />);

    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    expect(closeModalMock).toHaveBeenCalledTimes(1);
  });

  it('submits the form when all validations pass', () => {
    render(<AlertDeleteModal onCloseModal={closeModalMock} isVisible />);

    const activeCheckbox = screen.getByTestId('alert-delete-active-checkbox');
    fireEvent.click(activeCheckbox);

    const deleteInput = screen.getByTestId('alert-delete-delete-confirmation');
    fireEvent.change(deleteInput, { target: { value: i18n.DELETE_PASSKEY } });

    const submitButton = screen.getByTestId('alert-delete-submit');
    fireEvent.click(submitButton);

    expect(submitButton).not.toBeDisabled();
  });
});
