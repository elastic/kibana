/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { waitFor, fireEvent } from '@testing-library/dom';
import { kqlPluginMock } from '@kbn/kql/public/mocks';
import { act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { screen } from '@testing-library/react';
import { coreMock } from '@kbn/core/public/mocks';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { QuickSearchVisor, type QuickSearchVisorProps } from '.';

jest.mock('@kbn/esql-utils', () => ({
  ...jest.requireActual('@kbn/esql-utils'),
  getESQLAdHocDataview: jest.fn().mockResolvedValue({
    id: 'mock-adhoc-dataview',
    title: 'test_index',
    type: 'esql',
  }),
}));

describe('Quick search visor', () => {
  const corePluginMock = coreMock.createStart();
  const kqlMock = kqlPluginMock.createStartContract();
  (kqlMock.autocomplete.hasQuerySuggestions as jest.Mock).mockReturnValue(true);
  const dataMock = dataPluginMock.createStartContract();

  const validLicense = {
    status: 'active',
    hasAtLeast: jest.fn().mockReturnValue(true),
    getFeature: jest.fn().mockReturnValue({ isEnabled: false, isAvailable: false }),
  };

  const services = {
    core: corePluginMock,
    data: dataMock,
    kql: kqlMock,
    esql: {
      getLicense: jest.fn().mockResolvedValue(validLicense),
    },
  };

  function renderESQLVisor(testProps: QuickSearchVisorProps) {
    return (
      <KibanaContextProvider services={services}>
        <QuickSearchVisor {...testProps} />
      </KibanaContextProvider>
    );
  }

  const switchToNlMode = async (getByTestId: ReturnType<typeof renderWithI18n>['getByTestId']) => {
    let modeSelect: HTMLElement;
    await waitFor(() => {
      modeSelect = getByTestId('esqlVisorModeSelect');
    });
    const input = modeSelect!.querySelector('input')!;

    await act(async () => {
      fireEvent.click(input);
    });

    await waitFor(() => {
      expect(screen.getByText('Natural language')).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Natural language'));
    });
  };

  let props: QuickSearchVisorProps;
  beforeEach(() => {
    (corePluginMock.http.get as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/internal/esql/autocomplete/sources/')) {
        return Promise.resolve([
          { name: 'test_index', hidden: false, type: 'index' },
          { name: 'logs', hidden: false, type: 'index' },
        ]);
      }
      if (url.includes('/internal/inference/connectors')) {
        return Promise.resolve({ connectors: [{ connectorId: 'test-connector' }] });
      }
      return Promise.resolve([]);
    });
    props = {
      query: 'FROM test_index',
      isSpaceReduced: false,
      isVisible: true,
      onUpdateAndSubmitQuery: jest.fn(),
      onToggleVisor: jest.fn(),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render the sources dropdown and the KQL query input', async () => {
    const { getByTestId } = renderWithI18n(renderESQLVisor({ ...props }));
    // find the dropdown
    expect(getByTestId('ESQLEditor-visor-sources-dropdown')).toBeInTheDocument();

    expect(kqlMock.QueryStringInput).toHaveBeenCalled();
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

  it('should default to the first fetched source when query has no source', async () => {
    const { getByTestId } = renderWithI18n(renderESQLVisor({ ...props, query: 'ROW x =1' }));

    await waitFor(() => {
      expect(getByTestId('visorSourcesDropdownButton')).toHaveTextContent('test_index');
    });
  });

  it('should not render the mode selector when license is not enterprise', async () => {
    const invalidLicense = {
      status: 'active',
      hasAtLeast: jest.fn().mockReturnValue(false),
      getFeature: jest.fn().mockReturnValue({ isEnabled: false, isAvailable: false }),
    };
    services.esql.getLicense.mockResolvedValue(invalidLicense);
    const { queryByTestId } = renderWithI18n(renderESQLVisor({ ...props }));
    await act(async () => {});
    expect(queryByTestId('esqlVisorModeSelect')).not.toBeInTheDocument();
    services.esql.getLicense.mockResolvedValue(validLicense);
  });

  it('should render the mode selector when license is enterprise', async () => {
    const { getByTestId } = renderWithI18n(renderESQLVisor({ ...props }));
    await waitFor(() => {
      expect(getByTestId('esqlVisorModeSelect')).toBeInTheDocument();
    });
  });

  it('should switch to NL mode and show the NL input when connectors are available', async () => {
    const { getByTestId, queryByTestId } = renderWithI18n(renderESQLVisor({ ...props }));

    await switchToNlMode(getByTestId);

    await waitFor(() => {
      expect(getByTestId('esqlVisorNLQueryInput')).toBeInTheDocument();
    });

    expect(queryByTestId('ESQLEditor-visor-sources-dropdown')).not.toBeInTheDocument();
  });

  it('should show the no connector message when no connectors are configured', async () => {
    (corePluginMock.http.get as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/internal/esql/autocomplete/sources/')) {
        return Promise.resolve([{ name: 'test_index', hidden: false, type: 'index' }]);
      }
      if (url.includes('/internal/inference/connectors')) {
        return Promise.resolve({ connectors: [] });
      }
      return Promise.resolve([]);
    });

    const { getByTestId } = renderWithI18n(renderESQLVisor({ ...props }));

    await switchToNlMode(getByTestId);

    await waitFor(() => {
      expect(getByTestId('esqlVisorNoConnectorMessage')).toBeInTheDocument();
    });

    expect(screen.getByText('setup a connector')).toBeInTheDocument();
  });
});
