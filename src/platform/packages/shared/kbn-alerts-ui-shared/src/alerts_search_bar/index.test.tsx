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
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { Filter, FilterStateStore } from '@kbn/es-query';
import { ToastsStart } from '@kbn/core-notifications-browser';
import { useAlertsDataView, useFetchAlertsFieldsNewApi } from '../common/hooks';
import { AlertsSearchBar } from '.';
import { HttpStart } from '@kbn/core-http-browser';

const mockDataPlugin = dataPluginMock.createStartContract();
jest.mock('@kbn/kibana-utils-plugin/public');
jest.mock('../common/hooks');

const mockUseAlertsDataView = jest.mocked(useAlertsDataView);

const mockuseFetchAlertsFieldsNewApi = jest.mocked(useFetchAlertsFieldsNewApi);

const unifiedSearchBarMock = jest.fn().mockImplementation((props) => (
  <button
    data-test-subj="querySubmitButton"
    onClick={() => props.onQuerySubmit({ dateRange: { from: 'now', to: 'now' } })}
    type="button"
  >
    {'Hello world'}
  </button>
));

const toastsMock = { toasts: { addWarning: jest.fn() } } as unknown as ToastsStart;
const httpMock = {
  post: jest.fn(),
} as unknown as HttpStart;

describe('AlertsSearchBar', () => {
  beforeEach(() => {
    mockUseAlertsDataView.mockReturnValue({
      isLoading: false,
      dataView: {
        title: '.alerts-*',
        fields: [{ aggregatable: true, name: 'event.action', searchable: true, type: 'string' }],
      },
    });

    // @ts-expect-error: mocking only necessary attributes
    mockuseFetchAlertsFieldsNewApi.mockReturnValue({
      isLoading: false,
      data: {
        alertFields: {},
        fields: [],
      },
    });
    jest.clearAllMocks();
  });

  it('renders correctly', async () => {
    render(
      <AlertsSearchBar
        rangeFrom="now/d"
        rangeTo="now/d"
        query=""
        onQuerySubmit={jest.fn()}
        onFiltersUpdated={jest.fn()}
        appName={'test'}
        unifiedSearchBar={unifiedSearchBarMock}
        toasts={toastsMock}
        http={httpMock}
        dataService={mockDataPlugin}
      />
    );
    expect(await screen.findByTestId('querySubmitButton')).toBeInTheDocument();
  });

  it('calls onQuerySubmit correctly', async () => {
    const onQuerySubmitMock = jest.fn();

    render(
      <AlertsSearchBar
        rangeFrom="now/d"
        rangeTo="now/d"
        query=""
        onQuerySubmit={onQuerySubmitMock}
        onFiltersUpdated={jest.fn()}
        unifiedSearchBar={unifiedSearchBarMock}
        toasts={toastsMock}
        http={httpMock}
        dataService={mockDataPlugin}
        appName={'test'}
      />
    );

    fireEvent.click(await screen.findByTestId('querySubmitButton'));

    await waitFor(() => {
      expect(onQuerySubmitMock).toHaveBeenCalled();
    });
  });

  describe('With useAlertsDataView', () => {
    it('calls onFiltersUpdated correctly', async () => {
      const onFiltersUpdatedMock = jest.fn();
      const filters: Filter[] = [
        {
          meta: {
            negate: false,
            alias: null,
            disabled: false,
            type: 'custom',
            key: 'query',
          },
          query: { bool: { filter: [{ term: { 'kibana.alert.rule.consumer': 'stackAlerts' } }] } },
          $state: { store: FilterStateStore.APP_STATE },
        },
      ];

      const newUnifiedSearchBarMock = jest.fn().mockImplementation((props) => (
        <button
          data-test-subj="filtersSubmitButton"
          onClick={() => props.onFiltersUpdated(filters)}
          type="button"
        >
          {'Hello world'}
        </button>
      ));

      render(
        <AlertsSearchBar
          rangeFrom="now/d"
          rangeTo="now/d"
          query=""
          onQuerySubmit={jest.fn()}
          onFiltersUpdated={onFiltersUpdatedMock}
          unifiedSearchBar={newUnifiedSearchBarMock}
          toasts={toastsMock}
          http={httpMock}
          dataService={mockDataPlugin}
          appName={'test'}
        />
      );

      fireEvent.click(await screen.findByTestId('filtersSubmitButton'));

      await waitFor(() => {
        expect(onFiltersUpdatedMock).toHaveBeenCalledWith(filters);
        expect(mockDataPlugin.query.filterManager.setFilters).toHaveBeenCalledWith(filters);
      });
    });

    it('calls the unifiedSearchBar correctly for security rule types', async () => {
      render(
        <AlertsSearchBar
          rangeFrom="now/d"
          rangeTo="now/d"
          query=""
          onQuerySubmit={jest.fn()}
          toasts={toastsMock}
          http={httpMock}
          dataService={mockDataPlugin}
          appName={'test'}
          onFiltersUpdated={jest.fn()}
          unifiedSearchBar={unifiedSearchBarMock}
          ruleTypeIds={['siem.esqlRuleType', '.esQuery']}
        />
      );

      await waitFor(() => {
        expect(unifiedSearchBarMock).toHaveBeenCalledWith(
          expect.objectContaining({
            suggestionsAbstraction: undefined,
          })
        );
      });
    });

    it('calls the unifiedSearchBar correctly for NON security rule types', async () => {
      render(
        <AlertsSearchBar
          rangeFrom="now/d"
          rangeTo="now/d"
          query=""
          onQuerySubmit={jest.fn()}
          toasts={toastsMock}
          http={httpMock}
          dataService={mockDataPlugin}
          appName={'test'}
          onFiltersUpdated={jest.fn()}
          unifiedSearchBar={unifiedSearchBarMock}
          ruleTypeIds={['.esQuery']}
        />
      );

      await waitFor(() => {
        expect(unifiedSearchBarMock).toHaveBeenCalledWith(
          expect.objectContaining({
            suggestionsAbstraction: { type: 'alerts', fields: {} },
          })
        );
      });
    });

    it('calls the unifiedSearchBar with correct index patters', async () => {
      render(
        <AlertsSearchBar
          rangeFrom="now/d"
          rangeTo="now/d"
          query=""
          onQuerySubmit={jest.fn()}
          toasts={toastsMock}
          http={httpMock}
          dataService={mockDataPlugin}
          appName={'test'}
          onFiltersUpdated={jest.fn()}
          unifiedSearchBar={unifiedSearchBarMock}
          ruleTypeIds={['.esQuery', 'apm.anomaly']}
        />
      );

      await waitFor(() => {
        expect(unifiedSearchBarMock).toHaveBeenCalledWith(
          expect.objectContaining({
            indexPatterns: [
              {
                fields: [
                  { aggregatable: true, name: 'event.action', searchable: true, type: 'string' },
                ],
                title: '.esQuery,apm.anomaly',
              },
            ],
          })
        );
      });
    });

    it('calls the unifiedSearchBar with correct index patters without rule types', async () => {
      render(
        <AlertsSearchBar
          rangeFrom="now/d"
          rangeTo="now/d"
          query=""
          onQuerySubmit={jest.fn()}
          toasts={toastsMock}
          http={httpMock}
          dataService={mockDataPlugin}
          appName={'test'}
          onFiltersUpdated={jest.fn()}
          unifiedSearchBar={unifiedSearchBarMock}
        />
      );

      await waitFor(() => {
        expect(unifiedSearchBarMock).toHaveBeenCalledWith(
          expect.objectContaining({
            indexPatterns: [
              {
                fields: [
                  { aggregatable: true, name: 'event.action', searchable: true, type: 'string' },
                ],
                title: '.alerts-*',
              },
            ],
          })
        );
      });
    });

    it('calls the unifiedSearchBar with correct index patters without data views', async () => {
      jest.mocked(useAlertsDataView).mockReturnValue({
        isLoading: false,
        dataView: undefined,
      });

      render(
        <AlertsSearchBar
          rangeFrom="now/d"
          rangeTo="now/d"
          query=""
          onQuerySubmit={jest.fn()}
          toasts={toastsMock}
          http={httpMock}
          dataService={mockDataPlugin}
          appName={'test'}
          onFiltersUpdated={jest.fn()}
          unifiedSearchBar={unifiedSearchBarMock}
        />
      );

      await waitFor(() => {
        expect(unifiedSearchBarMock).toHaveBeenCalledWith(
          expect.objectContaining({
            indexPatterns: [],
          })
        );
      });
    });
  });

  describe('With useAlertsNewApiDataView', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      mockUseAlertsDataView.mockReturnValue({
        isLoading: false,
        dataView: undefined,
      });

      mockuseFetchAlertsFieldsNewApi.mockReturnValue({
        isLoading: false,
        data: {
          alertFields: {},
          fields: [
            // @ts-expect-error: mocking only necessary attributes
            {
              name: 'event.action',
              type: 'string',
              aggregatable: true,
              searchable: true,
            },
            // @ts-expect-error: mocking only necessary attributes
            {
              name: 'kibana.alert.rule.name',
              type: 'string',
              aggregatable: true,
              searchable: true,
            },
            // @ts-expect-error: mocking only necessary attributes
            {
              name: 'signal.rule.tags',
              type: 'string',
              aggregatable: true,
              searchable: true,
            },
          ],
        },
      });
    });

    it('calls onFiltersUpdated correctly', async () => {
      const onFiltersUpdatedMock = jest.fn();
      const filters: Filter[] = [
        {
          meta: {
            negate: false,
            alias: null,
            disabled: false,
            type: 'custom',
            key: 'query',
          },
          query: { bool: { filter: [{ term: { 'kibana.alert.rule.consumer': 'stackAlerts' } }] } },
          $state: { store: FilterStateStore.APP_STATE },
        },
      ];

      const newUnifiedSearchBarMock = jest.fn().mockImplementation((props) => (
        <button
          data-test-subj="filtersSubmitButton"
          onClick={() => props.onFiltersUpdated(filters)}
          type="button"
        >
          {'Hello world'}
        </button>
      ));

      render(
        <AlertsSearchBar
          rangeFrom="now/d"
          rangeTo="now/d"
          query=""
          onQuerySubmit={jest.fn()}
          onFiltersUpdated={onFiltersUpdatedMock}
          unifiedSearchBar={newUnifiedSearchBarMock}
          toasts={toastsMock}
          http={httpMock}
          dataService={mockDataPlugin}
          appName={'test'}
          enableNewAPIForFields={true}
        />
      );

      fireEvent.click(await screen.findByTestId('filtersSubmitButton'));

      await waitFor(() => {
        expect(onFiltersUpdatedMock).toHaveBeenCalledWith(filters);
        expect(mockDataPlugin.query.filterManager.setFilters).toHaveBeenCalledWith(filters);
      });
    });

    it('calls the unifiedSearchBar correctly for security rule types', async () => {
      render(
        <AlertsSearchBar
          rangeFrom="now/d"
          rangeTo="now/d"
          query=""
          onQuerySubmit={jest.fn()}
          toasts={toastsMock}
          http={httpMock}
          dataService={mockDataPlugin}
          appName={'test'}
          onFiltersUpdated={jest.fn()}
          unifiedSearchBar={unifiedSearchBarMock}
          ruleTypeIds={['siem.esqlRuleType', '.esQuery']}
          enableNewAPIForFields={true}
        />
      );

      await waitFor(() => {
        expect(unifiedSearchBarMock).toHaveBeenCalledWith(
          expect.objectContaining({
            suggestionsAbstraction: { type: 'alerts', fields: {} },
          })
        );
      });
    });

    it('calls the unifiedSearchBar correctly for NON security rule types', async () => {
      render(
        <AlertsSearchBar
          rangeFrom="now/d"
          rangeTo="now/d"
          query=""
          onQuerySubmit={jest.fn()}
          toasts={toastsMock}
          http={httpMock}
          dataService={mockDataPlugin}
          appName={'test'}
          onFiltersUpdated={jest.fn()}
          unifiedSearchBar={unifiedSearchBarMock}
          ruleTypeIds={['.esQuery']}
          enableNewAPIForFields={true}
        />
      );

      await waitFor(() => {
        expect(unifiedSearchBarMock).toHaveBeenCalledWith(
          expect.objectContaining({
            suggestionsAbstraction: { type: 'alerts', fields: {} },
          })
        );
      });
    });

    it('calls the unifiedSearchBar with correct index patters', async () => {
      render(
        <AlertsSearchBar
          rangeFrom="now/d"
          rangeTo="now/d"
          query=""
          onQuerySubmit={jest.fn()}
          toasts={toastsMock}
          http={httpMock}
          dataService={mockDataPlugin}
          appName={'test'}
          onFiltersUpdated={jest.fn()}
          unifiedSearchBar={unifiedSearchBarMock}
          ruleTypeIds={['.esQuery', 'apm.anomaly', 'siem.esqlRuleType']}
          enableNewAPIForFields={true}
        />
      );

      await waitFor(() => {
        expect(unifiedSearchBarMock).toHaveBeenCalledWith(
          expect.objectContaining({
            indexPatterns: [
              {
                fields: [
                  { aggregatable: true, name: 'event.action', searchable: true, type: 'string' },
                  {
                    name: 'kibana.alert.rule.name',
                    type: 'string',
                    aggregatable: true,
                    searchable: true,
                  },
                  {
                    name: 'signal.rule.tags',
                    type: 'string',
                    aggregatable: true,
                    searchable: true,
                  },
                ],
                title: '.esQuery,apm.anomaly,siem.esqlRuleType',
              },
            ],
          })
        );
      });
    });

    it('calls the unifiedSearchBar with correct index patters without rule types', async () => {
      render(
        <AlertsSearchBar
          rangeFrom="now/d"
          rangeTo="now/d"
          query=""
          onQuerySubmit={jest.fn()}
          toasts={toastsMock}
          http={httpMock}
          dataService={mockDataPlugin}
          appName={'test'}
          onFiltersUpdated={jest.fn()}
          unifiedSearchBar={unifiedSearchBarMock}
          enableNewAPIForFields={true}
        />
      );

      await waitFor(() => {
        expect(unifiedSearchBarMock).toHaveBeenCalledWith(
          expect.objectContaining({
            indexPatterns: [
              {
                fields: [
                  { aggregatable: true, name: 'event.action', searchable: true, type: 'string' },
                  {
                    name: 'kibana.alert.rule.name',
                    type: 'string',
                    aggregatable: true,
                    searchable: true,
                  },
                  {
                    name: 'signal.rule.tags',
                    type: 'string',
                    aggregatable: true,
                    searchable: true,
                  },
                ],
                title: 'all-rule-types',
              },
            ],
          })
        );
      });
    });

    it('calls the unifiedSearchBar with correct index patters without data views', async () => {
      // @ts-expect-error: mocking only necessary attributes
      jest.mocked(mockuseFetchAlertsFieldsNewApi).mockReturnValue({
        isLoading: false,
        data: {
          alertFields: {},
          fields: [],
        },
      });

      render(
        <AlertsSearchBar
          rangeFrom="now/d"
          rangeTo="now/d"
          query=""
          onQuerySubmit={jest.fn()}
          toasts={toastsMock}
          http={httpMock}
          dataService={mockDataPlugin}
          appName={'test'}
          onFiltersUpdated={jest.fn()}
          unifiedSearchBar={unifiedSearchBarMock}
          enableNewAPIForFields={true}
        />
      );

      await waitFor(() => {
        expect(unifiedSearchBarMock).toHaveBeenCalledWith(
          expect.objectContaining({
            indexPatterns: [],
          })
        );
      });
    });
  });
});
