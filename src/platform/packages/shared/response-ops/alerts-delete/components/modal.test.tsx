/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AlertDeleteModal } from './modal';
import * as i18n from '../translations';
import { httpServiceMock, notificationServiceMock } from '@kbn/core/public/mocks';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { IHttpFetchError, ResponseErrorBody } from '@kbn/core/public';

const http = httpServiceMock.createStartContract();
const notifications = notificationServiceMock.createStartContract();

describe('AlertDelete Modal', () => {
  const closeModalMock = jest.fn();
  const servicesMock = { http, notifications };

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        cacheTime: 0,
      },
    },
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <IntlProvider locale="en">
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </IntlProvider>
  );

  beforeEach(() => {
    jest.clearAllMocks();
    closeModalMock.mockClear();
  });

  it('renders the modal with initial state', () => {
    render(
      <AlertDeleteModal
        onCloseModal={closeModalMock}
        isVisible
        services={servicesMock}
        categoryIds={['management']}
      />,
      { wrapper }
    );

    expect(screen.getByText(i18n.MODAL_TITLE)).toBeInTheDocument();
    expect(screen.getByText(i18n.MODAL_DESCRIPTION)).toBeInTheDocument();
    expect(screen.getByText(i18n.ACTIVE_ALERTS)).toBeInTheDocument();
    expect(screen.getByText(i18n.INACTIVE_ALERTS)).toBeInTheDocument();
    expect(screen.getByTestId('alert-delete-active-threshold')).toBeDisabled();
    expect(screen.getByTestId('alert-delete-active-threshold-unit')).toBeDisabled();
    expect(screen.getByTestId('alert-delete-inactive-threshold')).toBeDisabled();
    expect(screen.getByTestId('alert-delete-inactive-threshold-unit')).toBeDisabled();
    expect(screen.getByTestId('alert-delete-preview-message').textContent).toEqual(
      'Select the type of alerts you wish to delete'
    );
  });

  it('enables the active alerts threshold when the checkbox is checked', () => {
    render(
      <AlertDeleteModal
        onCloseModal={closeModalMock}
        isVisible
        services={servicesMock}
        categoryIds={['management']}
      />,
      { wrapper }
    );

    const activeCheckbox = screen.getByTestId('alert-delete-active-checkbox');
    fireEvent.click(activeCheckbox);

    expect(activeCheckbox).toBeChecked();
    expect(screen.getByTestId('alert-delete-active-threshold')).not.toBeDisabled();
    expect(screen.getByTestId('alert-delete-active-threshold-unit')).not.toBeDisabled();
  });

  it('enables the inactive alerts threshold when the checkbox is checked', () => {
    render(
      <AlertDeleteModal
        onCloseModal={closeModalMock}
        isVisible
        services={servicesMock}
        categoryIds={['management']}
      />,
      { wrapper }
    );

    const inactiveCheckbox = screen.getByTestId('alert-delete-inactive-checkbox');
    fireEvent.click(inactiveCheckbox);

    expect(inactiveCheckbox).toBeChecked();
    expect(screen.getByTestId('alert-delete-inactive-threshold')).not.toBeDisabled();
    expect(screen.getByTestId('alert-delete-inactive-threshold-unit')).not.toBeDisabled();
  });

  it('validates the delete confirmation input', async () => {
    const apiResponse = {
      affected_alert_count: 100,
    };
    http.get.mockResolvedValueOnce(apiResponse);

    render(
      <AlertDeleteModal
        onCloseModal={closeModalMock}
        isVisible
        categoryIds={['management']}
        services={servicesMock}
      />,
      { wrapper }
    );

    const activeCheckbox = screen.getByTestId('alert-delete-active-checkbox');
    fireEvent.click(activeCheckbox);

    const deleteInput = screen.getByTestId('alert-delete-delete-confirmation');
    fireEvent.change(deleteInput, { target: { value: 'wrong-passkey' } });

    expect(deleteInput).toHaveValue('wrong-passkey');
    expect(screen.getByTestId('alert-delete-submit')).toBeDisabled();

    fireEvent.change(deleteInput, { target: { value: i18n.DELETE_PASSKEY } });
    expect(deleteInput).toHaveValue(i18n.DELETE_PASSKEY);

    await waitFor(() =>
      expect(screen.getByTestId('alert-delete-preview-message').textContent).toContain('100 alerts')
    );

    expect(screen.getByTestId('alert-delete-submit')).not.toBeDisabled();
  });

  it('calls closeModal when the cancel button is clicked', () => {
    render(
      <AlertDeleteModal
        onCloseModal={closeModalMock}
        isVisible
        services={servicesMock}
        categoryIds={['management']}
      />,
      { wrapper }
    );

    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    expect(closeModalMock).toHaveBeenCalledTimes(1);
  });

  it('submits the form when all validations pass', async () => {
    const apiResponse = {
      affected_alert_count: 100,
    };
    http.get.mockResolvedValueOnce(apiResponse);

    render(
      <AlertDeleteModal
        onCloseModal={closeModalMock}
        isVisible
        services={servicesMock}
        categoryIds={['management']}
      />,
      { wrapper }
    );

    const activeCheckbox = screen.getByTestId('alert-delete-active-checkbox');
    fireEvent.click(activeCheckbox);

    const deleteInput = await screen.findByTestId('alert-delete-delete-confirmation');
    fireEvent.change(deleteInput, { target: { value: i18n.DELETE_PASSKEY } });

    const submitButton = screen.getByTestId('alert-delete-submit');
    fireEvent.click(submitButton);

    await waitFor(() => expect(submitButton).not.toBeDisabled());
  });

  it('disables the submit button when no alert would be deleted with current settings', async () => {
    const apiResponse = {
      affected_alert_count: 0,
    };
    http.get.mockResolvedValueOnce(apiResponse);

    render(
      <AlertDeleteModal
        onCloseModal={closeModalMock}
        isVisible
        services={servicesMock}
        categoryIds={['management']}
      />,
      { wrapper }
    );

    const activeCheckbox = screen.getByTestId('alert-delete-active-checkbox');
    fireEvent.click(activeCheckbox);

    const submitButton = screen.getByTestId('alert-delete-submit');
    fireEvent.click(submitButton);

    await waitFor(() =>
      expect(screen.getByTestId('alert-delete-preview-message').textContent).toContain(
        'No alerts match the selected criteria.'
      )
    );
    expect(submitButton).toBeDisabled();
  });

  it('shows a success toast and closes the modal on successful schedule submission', async () => {
    http.get.mockResolvedValueOnce({ affected_alert_count: 100 });
    http.post.mockResolvedValueOnce(null);

    render(
      <AlertDeleteModal
        onCloseModal={closeModalMock}
        isVisible
        services={servicesMock}
        categoryIds={['management']}
      />,
      { wrapper }
    );

    const activeCheckbox = screen.getByTestId('alert-delete-active-checkbox');
    fireEvent.click(activeCheckbox);

    const deleteInput = screen.getByTestId('alert-delete-delete-confirmation');
    fireEvent.change(deleteInput, { target: { value: i18n.DELETE_PASSKEY } });

    const submitButton = screen.getByTestId('alert-delete-submit');
    await waitFor(() => {
      expect(submitButton).not.toBeDisabled();
    });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(notifications.toasts.addSuccess).toHaveBeenCalledWith(i18n.ALERT_DELETE_SUCCESS);
      expect(closeModalMock).toHaveBeenCalledTimes(1);
    });
  });

  it('shows an error toast on schedule submission failure', async () => {
    http.get.mockResolvedValueOnce({ affected_alert_count: 100 });
    const mockError: IHttpFetchError<ResponseErrorBody> = {
      body: {
        message: 'Request failed',
        statusCode: 500,
      },
      name: 'Error',
      request: {} as unknown as Request,
      message: 'Internal Server Error',
    };
    http.post.mockRejectedValueOnce(mockError);

    render(
      <AlertDeleteModal
        onCloseModal={closeModalMock}
        isVisible
        services={servicesMock}
        categoryIds={['management']}
      />,
      { wrapper }
    );

    const activeCheckbox = screen.getByTestId('alert-delete-active-checkbox');
    fireEvent.click(activeCheckbox);

    const deleteInput = screen.getByTestId('alert-delete-delete-confirmation');
    fireEvent.change(deleteInput, { target: { value: i18n.DELETE_PASSKEY } });

    const submitButton = screen.getByTestId('alert-delete-submit');
    await waitFor(() => {
      expect(submitButton).not.toBeDisabled();
    });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(notifications.toasts.addDanger).toHaveBeenCalled();
    });
    expect(notifications.toasts.addDanger).toHaveBeenCalledWith({
      title: i18n.ALERT_DELETE_FAILURE,
      text: 'Request failed',
    });
    expect(closeModalMock).toHaveBeenCalledTimes(0);
  });

  it('shows a generic error toast if the error response does not have a message', async () => {
    http.get.mockResolvedValueOnce({ affected_alert_count: 100 });
    const errorResponse = {};
    http.post.mockRejectedValueOnce(errorResponse);

    render(
      <AlertDeleteModal
        onCloseModal={closeModalMock}
        isVisible
        services={servicesMock}
        categoryIds={['management']}
      />,
      { wrapper }
    );

    const activeCheckbox = screen.getByTestId('alert-delete-active-checkbox');
    fireEvent.click(activeCheckbox);

    const deleteInput = screen.getByTestId('alert-delete-delete-confirmation');
    fireEvent.change(deleteInput, { target: { value: i18n.DELETE_PASSKEY } });

    const submitButton = screen.getByTestId('alert-delete-submit');
    await waitFor(() => {
      expect(submitButton).not.toBeDisabled();
    });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(notifications.toasts.addDanger).toHaveBeenCalledWith({
        title: i18n.ALERT_DELETE_FAILURE,
        text: JSON.stringify(errorResponse),
      });
    });
  });
});
