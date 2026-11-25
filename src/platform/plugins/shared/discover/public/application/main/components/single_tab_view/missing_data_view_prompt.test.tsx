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
import { DiscoverTestProvider } from '../../../../__mocks__/test_provider';
import { getDiscoverInternalStateMock } from '../../../../__mocks__/discover_state.mock';
import { dataViewWithTimefieldMock } from '../../../../__mocks__/data_view_with_timefield';
import { MissingDataViewPrompt } from './missing_data_view_prompt';

describe('MissingDataViewPrompt', () => {
  it('should let the user pick a replacement for the missing data view', async () => {
    const toolkit = getDiscoverInternalStateMock({
      persistedDataViews: [dataViewWithTimefieldMock],
    });
    await toolkit.initializeTabs();
    const onSelectDataView = jest.fn();

    render(
      <DiscoverTestProvider
        services={toolkit.services}
        internalState={toolkit.internalState}
        runtimeStateManager={toolkit.runtimeStateManager}
      >
        <MissingDataViewPrompt
          missingDataViewId="deleted-data-view-id"
          adHocDataViews={[]}
          onSelectDataView={onSelectDataView}
        />
      </DiscoverTestProvider>
    );

    expect(screen.getByText('Data view not found')).toBeInTheDocument();
    expect(screen.getByText('deleted-data-view-id')).toBeInTheDocument();

    await userEvent.click(await screen.findByTestId('discoverMissingDataViewPicker'));
    await userEvent.click(await screen.findByTestId(`dataView-${dataViewWithTimefieldMock.name}`));

    expect(onSelectDataView).toHaveBeenCalledWith(dataViewWithTimefieldMock.id);
  });
});
