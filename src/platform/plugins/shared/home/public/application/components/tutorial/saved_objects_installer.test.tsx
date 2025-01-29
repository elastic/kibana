/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { fireEvent, render, waitFor } from '@testing-library/react';
import { SavedObjectsBatchResponse, SimpleSavedObject } from '@kbn/core-saved-objects-api-browser';
import { SavedObjectsInstaller } from './saved_objects_installer';

test('renders', () => {
  const bulkCreateMock = jest
    .fn<Promise<SavedObjectsBatchResponse<unknown>>, []>()
    .mockResolvedValue({
      savedObjects: [],
    });

  const component = render(
    <IntlProvider>
      <SavedObjectsInstaller bulkCreate={bulkCreateMock} savedObjects={[]} />
    </IntlProvider>
  );
  expect(component).toMatchSnapshot();
});

describe('bulkCreate', () => {
  const savedObject = {
    id: '1',
    type: 'index-pattern',
    attributes: {},
  } as SimpleSavedObject;

  test('should display success message when bulkCreate is successful', async () => {
    const bulkCreateMock = jest
      .fn<Promise<SavedObjectsBatchResponse<unknown>>, []>()
      .mockResolvedValue({
        savedObjects: [savedObject],
      });

    const { getByTestId, getByText } = render(
      <IntlProvider>
        <SavedObjectsInstaller bulkCreate={bulkCreateMock} savedObjects={[savedObject]} />
      </IntlProvider>
    );

    fireEvent.click(getByTestId('loadSavedObjects'));

    await waitFor(() => {
      expect(getByText('1 saved objects successfully added')).toBeInTheDocument();
    });
    expect(document.body).toMatchSnapshot();
  });

  test('should display error message when bulkCreate request fails', async () => {
    const bulkCreateMock = jest
      .fn<Promise<SavedObjectsBatchResponse<unknown>>, []>()
      .mockRejectedValue(new Error('simulated bulkRequest error'));

    const { getByTestId, getByText } = render(
      <IntlProvider>
        <SavedObjectsInstaller bulkCreate={bulkCreateMock} savedObjects={[savedObject]} />
      </IntlProvider>
    );

    fireEvent.click(getByTestId('loadSavedObjects'));

    await waitFor(() => {
      expect(getByText('Request failed, Error: simulated bulkRequest error')).toBeInTheDocument();
    });
    expect(document.body).toMatchSnapshot();
  });

  test('should filter out saved object version before calling bulkCreate', async () => {
    const bulkCreateMock = jest.fn().mockResolvedValue({
      savedObjects: [savedObject],
    });
    const { getByTestId } = render(
      <IntlProvider>
        <SavedObjectsInstaller
          bulkCreate={bulkCreateMock}
          savedObjects={[{ ...savedObject, version: 'foo' }]}
        />
      </IntlProvider>
    );

    fireEvent.click(getByTestId('loadSavedObjects'));

    await waitFor(() => {
      expect(bulkCreateMock).toHaveBeenCalledWith([savedObject], expect.any(Object));
    });
  });
});
