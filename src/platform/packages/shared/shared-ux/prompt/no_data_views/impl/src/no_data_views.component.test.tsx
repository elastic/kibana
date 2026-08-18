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
import { NoDataViewsPrompt } from './no_data_views.component';

describe('<NoDataViewsPromptComponent />', () => {
  test('is rendered correctly', () => {
    render(
      <NoDataViewsPrompt
        onClickCreate={jest.fn()}
        canCreateNewDataView={true}
        dataViewsDocLink="doc-link-data-views"
        esqlDocLink="doc-link-esql"
        onTryESQL={jest.fn()}
      />
    );

    // Check for both data view and ESQL sections
    expect(screen.getByTestId('noDataViewsPromptCreateDataView')).toBeInTheDocument();
    expect(screen.getByTestId('noDataViewsTryESQL')).toBeInTheDocument();

    // Check for buttons
    expect(screen.getByTestId('createDataViewButton')).toBeInTheDocument();
    expect(screen.getByTestId('tryESQLLink')).toBeInTheDocument();

    // Check for documentation links
    expect(screen.getByTestId('docLinkDataViews')).toBeInTheDocument();
    expect(screen.getByTestId('docLinkEsql')).toBeInTheDocument();
  });

  test('renders the add data card only when a link to add data is given', () => {
    const { rerender } = render(<NoDataViewsPrompt canCreateNewDataView={true} />);

    expect(screen.queryByTestId('noDataViewsPromptAddData')).not.toBeInTheDocument();

    rerender(
      <NoDataViewsPrompt
        canCreateNewDataView={true}
        addDataHref="/app/integrations/browse"
        addDataDocLink="doc-link-add-data"
      />
    );

    expect(screen.getByTestId('noDataViewsPromptAddData')).toBeInTheDocument();
    expect(screen.getByTestId('browseIntegrationsLink')).toHaveAttribute(
      'href',
      '/app/integrations/browse'
    );
    expect(screen.getByTestId('docLinkAddData')).toBeInTheDocument();
  });

  test('omits the create data view card if showCreateDataView is false', () => {
    render(
      <NoDataViewsPrompt
        canCreateNewDataView={true}
        onTryESQL={jest.fn()}
        showCreateDataView={false}
      />
    );

    expect(screen.queryByTestId('noDataViewsPromptCreateDataView')).not.toBeInTheDocument();
    expect(screen.getByTestId('noDataViewsTryESQL')).toBeInTheDocument();
  });

  test('disables "Create data view" button if canCreateNewDataViews is false', () => {
    render(<NoDataViewsPrompt canCreateNewDataView={false} />);

    const button = screen.getByTestId('createDataViewButton');
    expect(button).toBeDisabled();
  });

  test('onClickCreate', async () => {
    const user = userEvent.setup();
    const onClickCreate = jest.fn();

    render(
      <NoDataViewsPrompt
        canCreateNewDataView={true}
        onClickCreate={onClickCreate}
        dataViewsDocLink="doc-link/data-view"
      />
    );

    await user.click(screen.getByTestId('createDataViewButton'));

    expect(onClickCreate).toHaveBeenCalledTimes(1);
  });

  test('onClickTryEsql', async () => {
    const user = userEvent.setup();
    const onClickTryEsql = jest.fn();

    render(
      <NoDataViewsPrompt
        canCreateNewDataView={false}
        onTryESQL={onClickTryEsql}
        esqlDocLink="doc-link/esql"
      />
    );

    await user.click(screen.getByTestId('tryESQLLink'));

    expect(onClickTryEsql).toHaveBeenCalledTimes(1);
  });
});
