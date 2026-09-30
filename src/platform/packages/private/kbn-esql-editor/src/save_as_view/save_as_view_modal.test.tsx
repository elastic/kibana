/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { coreMock } from '@kbn/core/public/mocks';
import {
  createEsqlViewsManagementClient,
  ESQL_VIEW_ALREADY_EXISTS_ERROR_TYPE,
  EsqlViewsClientError,
} from '@kbn/esql-utils';
import { SaveAsViewModal } from './save_as_view_modal';

jest.mock('@kbn/esql-utils', () => {
  const actual = jest.requireActual('@kbn/esql-utils');
  return {
    ...actual,
    createEsqlViewsManagementClient: jest.fn(),
  };
});

const createView = jest.fn();
const query = 'FROM logs-* | LIMIT 10';

const renderModal = (onClose = jest.fn(), onSaved = jest.fn()) => {
  const core = coreMock.createStart();
  render(
    <KibanaContextProvider services={{ core }}>
      <SaveAsViewModal query={query} onClose={onClose} onSaved={onSaved} />
    </KibanaContextProvider>
  );
  return { core, onClose, onSaved };
};

const submitForm = () => {
  const button = screen.getByTestId('saveAsViewSubmitButton') as HTMLButtonElement;
  fireEvent.submit(button.form ?? button);
};

const submitView = (name: string, description?: string) => {
  fireEvent.change(screen.getByTestId('saveAsViewNameInput'), { target: { value: name } });
  if (description !== undefined) {
    fireEvent.change(screen.getByTestId('saveAsViewDescriptionInput'), {
      target: { value: description },
    });
  }
  submitForm();
};

describe('SaveAsViewModal', () => {
  beforeEach(() => {
    createView.mockReset();
    createView.mockResolvedValue({});
    jest.mocked(createEsqlViewsManagementClient).mockReturnValue({
      createView,
    } as unknown as ReturnType<typeof createEsqlViewsManagementClient>);
  });

  it('requires a name', () => {
    renderModal();

    submitForm();

    expect(screen.getByText('Enter a name.')).toBeInTheDocument();
    expect(createView).not.toHaveBeenCalled();
  });

  it('rejects an invalid name', () => {
    renderModal();

    submitView('Sales view');

    expect(screen.getByText(/Use lowercase characters/)).toBeInTheDocument();
    expect(createView).not.toHaveBeenCalled();
  });

  it('omits an empty description', async () => {
    renderModal();

    submitView('sales');

    await waitFor(() =>
      expect(createView).toHaveBeenCalledWith({
        name: 'sales',
        query,
        description: undefined,
      })
    );
  });

  it('saves the name, description, and query', async () => {
    renderModal();

    submitView('sales', 'Daily sales');

    await waitFor(() =>
      expect(createView).toHaveBeenCalledWith({
        name: 'sales',
        query,
        description: 'Daily sales',
      })
    );
  });

  it('shows an inline error when the view already exists', async () => {
    createView.mockRejectedValue(
      new EsqlViewsClientError(
        'An ES|QL view named "sales" already exists',
        409,
        undefined,
        ESQL_VIEW_ALREADY_EXISTS_ERROR_TYPE
      )
    );
    const { onSaved } = renderModal();

    submitView('sales');

    expect(await screen.findByText('A view with this name already exists.')).toBeInTheDocument();
    expect(onSaved).not.toHaveBeenCalled();
  });

  it('shows a name conflict when another resource uses the name', async () => {
    createView.mockRejectedValue(
      new EsqlViewsClientError(
        'index [sales] already exists',
        400,
        undefined,
        'resource_already_exists_exception'
      )
    );
    renderModal();

    submitView('sales');

    expect(
      await screen.findByText('This name is already used by another Elasticsearch resource.')
    ).toBeInTheDocument();
    expect(screen.getByTestId('saveAsViewNameConflictDetails')).toBeInTheDocument();
  });

  it('shows other save failures in the modal', async () => {
    createView.mockRejectedValue(new EsqlViewsClientError('cluster unavailable', 500));
    const { onClose } = renderModal();

    submitView('sales');

    expect(await screen.findByTestId('saveAsViewSaveError')).toHaveTextContent(
      'cluster unavailable'
    );
    expect(onClose).not.toHaveBeenCalled();
  });

  it('shows a toast and closes after a successful save', async () => {
    const { core, onClose, onSaved } = renderModal();

    submitView('sales');

    await waitFor(() => {
      expect(core.notifications.toasts.addSuccess).toHaveBeenCalledWith({
        title: 'View "sales" was saved.',
      });
      expect(onSaved).toHaveBeenCalledWith('sales');
      expect(onClose).toHaveBeenCalled();
    });
  });
});
