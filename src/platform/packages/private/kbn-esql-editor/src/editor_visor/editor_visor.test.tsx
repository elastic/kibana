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

  const services = {
    core: corePluginMock,
    data: dataMock,
    kql: kqlMock,
    esql: {
      getLicense: jest.fn().mockResolvedValue(null),
    },
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
    window.localStorage.clear();
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
      onUpdateAndSubmitQuery: jest.fn(),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render the sources dropdown and the KQL query input', async () => {
    const { getByTestId } = renderWithI18n(renderESQLVisor({ ...props }));

    await waitFor(() => {
      expect(getByTestId('ESQLEditor-visor-sources-dropdown')).toBeInTheDocument();
    });

    expect(kqlMock.QueryStringInput).toHaveBeenCalled();
  });

  it('should display the available sources in the dropdown list', async () => {
    const { getByTestId } = renderWithI18n(renderESQLVisor({ ...props }));

    await waitFor(() => {
      expect(getByTestId('ESQLEditor-visor-sources-dropdown')).toBeInTheDocument();
    });

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

  it('should build a TS query when the current query uses the TS command', async () => {
    const onUpdateAndSubmitQuery = jest.fn();
    renderWithI18n(renderESQLVisor({ ...props, query: 'TS ts_index', onUpdateAndSubmitQuery }));

    await waitFor(() => expect(kqlMock.QueryStringInput).toHaveBeenCalled());

    const { onSubmit } = (kqlMock.QueryStringInput as jest.Mock).mock.calls.at(-1)[0];
    act(() => onSubmit({ query: 'hostname:web-01', language: 'kuery' }));

    expect(onUpdateAndSubmitQuery).toHaveBeenCalledWith(
      expect.stringMatching(/^TS ts_index \| WHERE KQL/)
    );
  });

  it('should not show a submit button', async () => {
    const { queryByTestId } = renderWithI18n(renderESQLVisor({ ...props }));
    await act(async () => {});
    expect(queryByTestId('esqlVisorKQLSubmit')).not.toBeInTheDocument();
  });

  it('should not show a mode selector', async () => {
    const { queryByTestId } = renderWithI18n(renderESQLVisor({ ...props }));
    await act(async () => {});
    expect(queryByTestId('esqlVisorModeSelect')).not.toBeInTheDocument();
  });

  it('should not show the Ask AI button when license is not enterprise', async () => {
    const { queryByTestId } = renderWithI18n(renderESQLVisor({ ...props }));
    await act(async () => {});
    expect(queryByTestId('esqlVisorAskAiButton')).not.toBeInTheDocument();
  });

  describe('with enterprise license and connector', () => {
    const enterpriseServices = {
      ...services,
      esql: {
        getLicense: jest.fn().mockResolvedValue({
          status: 'active',
          hasAtLeast: jest.fn().mockReturnValue(true),
          getFeature: jest.fn().mockReturnValue({ isAvailable: false }),
        }),
      },
    };

    function renderWithEnterprise(testProps: QuickSearchVisorProps) {
      return (
        <KibanaContextProvider services={enterpriseServices}>
          <QuickSearchVisor {...testProps} />
        </KibanaContextProvider>
      );
    }

    it('should show the Ask AI button when license is enterprise and connector exists', async () => {
      const { getByTestId } = renderWithI18n(renderWithEnterprise({ ...props }));
      await waitFor(() => {
        expect(getByTestId('esqlVisorAskAiButton')).toBeInTheDocument();
      });
    });

    it('should switch to NL mode when Ask AI is clicked', async () => {
      const { getByTestId, queryByTestId } = renderWithI18n(renderWithEnterprise({ ...props }));
      await waitFor(() => {
        expect(getByTestId('esqlVisorAskAiButton')).toBeInTheDocument();
      });
      await act(async () => {
        await userEvent.click(getByTestId('esqlVisorAskAiButton'));
      });
      expect(getByTestId('esqlVisorNLQueryInput')).toBeInTheDocument();
      expect(queryByTestId('esqlVisorAskAiButton')).not.toBeInTheDocument();
    });

    it('should render the sources dropdown with reduced opacity in NL mode', async () => {
      const { getByTestId } = renderWithI18n(renderWithEnterprise({ ...props }));
      await waitFor(() => {
        expect(getByTestId('esqlVisorAskAiButton')).toBeInTheDocument();
      });
      await act(async () => {
        await userEvent.click(getByTestId('esqlVisorAskAiButton'));
      });
      expect(getByTestId('ESQLEditor-visor-sources-dropdown')).toBeInTheDocument();
    });

    it('should show the Stop button while NL generation is in progress', async () => {
      (corePluginMock.http.post as jest.Mock).mockImplementation(() => new Promise(() => {}));

      const { getByTestId } = renderWithI18n(renderWithEnterprise({ ...props }));

      await waitFor(() => expect(getByTestId('esqlVisorAskAiButton')).toBeInTheDocument());
      await act(async () => {
        await userEvent.click(getByTestId('esqlVisorAskAiButton'));
      });

      const nlInput = getByTestId('esqlVisorNLQueryInput');
      await act(async () => {
        await userEvent.type(nlInput, 'show me logs{enter}');
      });

      await waitFor(() => expect(getByTestId('esqlVisorStopGeneration')).toBeInTheDocument());
    });

    it('should return to KQL mode when back button is clicked', async () => {
      const { getByTestId, queryByTestId } = renderWithI18n(renderWithEnterprise({ ...props }));
      await waitFor(() => {
        expect(getByTestId('esqlVisorAskAiButton')).toBeInTheDocument();
      });
      await act(async () => {
        await userEvent.click(getByTestId('esqlVisorAskAiButton'));
      });
      expect(getByTestId('esqlVisorNLQueryInput')).toBeInTheDocument();
      await act(async () => {
        await userEvent.click(getByTestId('esqlVisorBackToKql'));
      });
      await waitFor(() => {
        expect(queryByTestId('esqlVisorNLQueryInput')).not.toBeInTheDocument();
        expect(getByTestId('esqlVisorAskAiButton')).toBeInTheDocument();
      });
    });
  });
});
