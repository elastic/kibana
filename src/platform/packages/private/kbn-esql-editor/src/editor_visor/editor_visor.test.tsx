/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { waitFor } from '@testing-library/dom';
import { act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { screen } from '@testing-library/react';
import { coreMock } from '@kbn/core/public/mocks';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { QuickSearchVisor, type QuickSearchVisorProps } from '.';

describe('Quick search visor', () => {
  const corePluginMock = coreMock.createStart();

  corePluginMock.http.get = jest.fn().mockImplementation((url: string) => {
    if (url.includes('/internal/esql/autocomplete/sources/')) {
      return Promise.resolve([
        { name: 'test_index', hidden: false, type: 'index' },
        { name: 'logs', hidden: false, type: 'index' },
      ]);
    }
    return Promise.resolve([]);
  });

  const services = {
    core: corePluginMock,
  };

  function renderESQLVisor(testProps: QuickSearchVisorProps) {
    return (
      <KibanaContextProvider services={services}>
        <QuickSearchVisor {...testProps} />
      </KibanaContextProvider>
    );
  }
  let props: QuickSearchVisorProps;
  beforeEach(() => {
    props = {
      query: 'FROM test_index',
      isSpaceReduced: false,
      isVisible: true,
      onClose: jest.fn(),
      onUpdateAndSubmitQuery: jest.fn(),
    };
  });

  afterAll(() => {
    jest.clearAllMocks();
  });
  it('should render the sources dropdown and the search input test', async () => {
    const { getByTestId } = renderWithI18n(renderESQLVisor({ ...props }));
    // find the dropdown
    expect(getByTestId('ESQLEditor-visor-sources-dropdown')).toBeInTheDocument();

    // find the search input
    expect(getByTestId('ESQLEditor-visor-search-input')).toBeInTheDocument();
  });

  it('should display the available sources in the dropdown list', async () => {
    const { getByTestId } = renderWithI18n(renderESQLVisor({ ...props }));

    // Open the dropdown
    const dropdownButton = getByTestId('visorSourcesDropdownButton');
    await act(async () => {
      await userEvent.click(dropdownButton);
    });

    await waitFor(() => {
      expect(getByTestId('esqlEditor-visor-datasourcesList-switcher')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getAllByText('test_index').length).toBeGreaterThan(0);
      expect(screen.getAllByText('logs').length).toBeGreaterThan(0);
    });
  });

  it('should call the onUpdateAndSubmitQuery after pressing Enter in the search input', async () => {
    const { getByTestId } = renderWithI18n(renderESQLVisor({ ...props }));

    const searchInput = getByTestId('ESQLEditor-visor-search-input');
    await act(async () => {
      await userEvent.type(searchInput, 'error');
    });

    await act(async () => {
      await userEvent.keyboard('{Enter}');
    });

    expect(props.onUpdateAndSubmitQuery).toHaveBeenCalledWith(
      'FROM test_index | WHERE KQL("error")'
    );
  });
});
