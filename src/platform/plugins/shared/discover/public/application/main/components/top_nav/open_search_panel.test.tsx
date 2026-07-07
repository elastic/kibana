/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { OpenSearchPanel } from './open_search_panel';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { screen } from '@testing-library/react';
import { useDiscoverServices } from '../../../../hooks/use_discover_services';

jest.mock('../../../../hooks/use_discover_services');

const useDiscoverServicesMock = jest.mocked(useDiscoverServices);

const mockUseDiscoverServicesMock = (capabilitiesOptions: object) => {
  useDiscoverServicesMock.mockReturnValue({
    addBasePath: (path: string) => path,
    capabilities: capabilitiesOptions,
    core: {},
    savedObjectsFinder: { Finder: jest.fn() },
  } as unknown as ReturnType<typeof useDiscoverServices>);
};

describe('OpenSearchPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders "manage discover sessions" button if user has permission', async () => {
    mockUseDiscoverServicesMock({
      savedObjectsManagement: { edit: true },
    });

    renderWithI18n(<OpenSearchPanel onClose={jest.fn()} onOpenSavedSearch={jest.fn()} />);

    expect(await screen.findByTestId('loadSearchForm', {}, { timeout: 0 })).toBeVisible();
    expect(screen.getByText(/open discover session/i)).toBeVisible();
    expect(screen.getByText(/manage discover sessions/i)).toBeVisible();
  });

  it('should not render "manage discover sessions" button without permissions', async () => {
    mockUseDiscoverServicesMock({
      savedObjectsManagement: { edit: false, delete: false },
    });

    renderWithI18n(<OpenSearchPanel onClose={jest.fn()} onOpenSavedSearch={jest.fn()} />);
    expect(await screen.findByTestId('loadSearchForm', {}, { timeout: 0 })).toBeVisible();
    expect(screen.getByText(/open discover session/i)).toBeVisible();
    expect(screen.queryByTestId('manageSearchesBtn')).not.toBeInTheDocument();
  });
});
