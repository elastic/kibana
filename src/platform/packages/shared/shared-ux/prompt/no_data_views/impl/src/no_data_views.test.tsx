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

import type { NoDataViewsPromptServices } from '@kbn/shared-ux-prompt-no-data-views-types';
import { getNoDataViewsPromptServicesMock } from '@kbn/shared-ux-prompt-no-data-views-mocks';

import { NoDataViewsPrompt } from './no_data_views';
import { NoDataViewsPromptProvider } from './services';

describe('NoDataViewsPrompt', () => {
  let services: NoDataViewsPromptServices;
  const user = userEvent.setup();

  beforeEach(() => {
    services = getNoDataViewsPromptServicesMock();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  const renderComponent = (props = {}) => {
    return render(
      <NoDataViewsPromptProvider {...services}>
        <NoDataViewsPrompt onDataViewCreated={jest.fn()} {...props} />
      </NoDataViewsPromptProvider>
    );
  };

  it('calls openDataViewEditor when create data view button is clicked', async () => {
    renderComponent();

    expect(services.openDataViewEditor).not.toHaveBeenCalled();

    const createButton = screen.getByTestId('createDataViewButton');
    await user.click(createButton);

    expect(services.openDataViewEditor).toHaveBeenCalled();
  });

  it('calls onTryESQL when try ESQL button is clicked', async () => {
    renderComponent();

    expect(services.onTryESQL).not.toHaveBeenCalled();

    const tryESQLButton = screen.getByTestId('tryESQLLink');
    await user.click(tryESQLButton);

    expect(services.onTryESQL).toHaveBeenCalled();
  });
});
