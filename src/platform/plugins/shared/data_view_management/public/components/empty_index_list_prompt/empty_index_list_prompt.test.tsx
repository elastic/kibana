/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EmptyIndexListPrompt } from './empty_index_list_prompt';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';

import { DiscoverTestProvider } from '@kbn/discover-plugin/public/__mocks__/test_provider';

describe('EmptyIndexListPrompt', () => {
  it('should render normally', async () => {
    render(
      <DiscoverTestProvider>
        <EmptyIndexListPrompt
          onRefresh={jest.fn()}
          createAnyway={jest.fn()}
          addDataUrl={'http://elastic.co'}
          navigateToApp={jest.fn()}
          canSaveIndexPattern
        />
      </DiscoverTestProvider>
    );

    const emptyStatePanel = screen.getByTestId('indexPatternEmptyState');
    expect(emptyStatePanel).toBeInTheDocument();

    const refreshButton = screen.getByTestId('refreshIndicesButton');
    expect(refreshButton).toBeInTheDocument();
  });

  it('calls onRefresh when refresh button is clicked', async () => {
    const onRefresh = jest.fn();
    render(
      <DiscoverTestProvider>
        <EmptyIndexListPrompt
          onRefresh={onRefresh}
          createAnyway={jest.fn()}
          addDataUrl={'http://elastic.co'}
          navigateToApp={jest.fn()}
          canSaveIndexPattern
        />
      </DiscoverTestProvider>
    );

    const refreshButton = screen.getByTestId('refreshIndicesButton');
    await userEvent.click(refreshButton);

    expect(onRefresh).toHaveBeenCalledTimes(1);
  });
});
