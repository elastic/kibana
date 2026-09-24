/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import type { EsqlView, EsqlViewsResult } from '@kbn/esql-types';
import { SOURCES_TYPES } from '@kbn/esql-types';
import { getDatasets, getESQLSources, getViews } from '@kbn/esql-utils';
import { DataSourceBrowser } from './data_source_browser';
import { DataSourceSelectionChange } from '../types';
import { DATA_SOURCE_BROWSER_I18N_KEYS } from './i18n';

jest.mock('@kbn/esql-utils', () => ({
  getDatasets: jest.fn(),
  getESQLSources: jest.fn(),
  getTimeseriesIndices: jest.fn(),
  getViews: jest.fn(),
}));

const getViewsMock = getViews as unknown as jest.MockedFunction<
  (http: unknown) => Promise<EsqlViewsResult>
>;
const getDatasetsMock = getDatasets as unknown as jest.MockedFunction<
  () => Promise<{ datasets: [] }>
>;
const getESQLSourcesMock = getESQLSources as jest.MockedFunction<typeof getESQLSources>;

const views: EsqlView[] = [
  { name: 'errors_view', query: 'FROM logs-* | WHERE log.level == "error"' },
  { name: 'latency_view', query: 'FROM traces-*' },
];

/** The `this` the browser invoked `getViews` with. */
let viewsCallContext: unknown;

const mockViews = (result: EsqlViewsResult) => {
  getViewsMock.mockImplementation(function (this: unknown) {
    viewsCallContext = this;
    return Promise.resolve(result);
  });
};

const http = {};

const renderBrowser = ({ onSelect = jest.fn() }: { onSelect?: jest.Mock } = {}) => {
  render(
    <KibanaContextProvider services={{ core: { http, application: { capabilities: {} } } }}>
      <DataSourceBrowser
        isOpen
        isTimeseries={false}
        onClose={jest.fn()}
        onSelect={onSelect}
        position={{ top: 0, left: 0 }}
      />
    </KibanaContextProvider>
  );

  return { onSelect };
};

const getResourceList = () => within(screen.getByTestId('esqlDataSourceBrowser'));

// Filter options are labelled with the type name, resource options with the resource name
// followed by its type, so matching the leading text picks out the filter option.
const clickTypeFilterOption = async (label: string) => {
  await userEvent.click(
    screen.getByRole('button', { name: DATA_SOURCE_BROWSER_I18N_KEYS.filterTitle })
  );
  await userEvent.click(
    await screen.findByRole('option', { name: (name: string) => name.startsWith(label) })
  );
};

beforeEach(() => {
  jest.clearAllMocks();
  viewsCallContext = undefined;
  getESQLSourcesMock.mockResolvedValue([
    { name: 'logs-*', hidden: false, type: SOURCES_TYPES.DATA_STREAM },
  ]);
  getDatasetsMock.mockResolvedValue({ datasets: [] });
  mockViews({ views });
});

describe('DataSourceBrowser views', () => {
  it('lists the views returned for the current user alongside the other sources', async () => {
    renderBrowser();

    expect(
      await getResourceList().findByRole('option', { name: /errors_view/ })
    ).toBeInTheDocument();
    expect(getResourceList().getByRole('option', { name: /latency_view/ })).toBeInTheDocument();
    expect(getResourceList().getByRole('option', { name: /logs-\*/ })).toBeInTheDocument();
  });

  it('refreshes the shared views cache the editor validates against', async () => {
    renderBrowser();

    await getResourceList().findByRole('option', { name: /errors_view/ });

    expect(viewsCallContext).toEqual({ forceRefresh: true });
    expect(getViewsMock).toHaveBeenCalledWith(http);
  });

  it('labels views with the dedicated view source type', async () => {
    renderBrowser();

    const view = await getResourceList().findByRole('option', { name: /errors_view/ });
    expect(view).toHaveTextContent('View');
  });

  it('filters views independently from the other source types', async () => {
    renderBrowser();

    await getResourceList().findByRole('option', { name: /errors_view/ });

    await clickTypeFilterOption('View');

    await waitFor(() => {
      expect(getResourceList().queryByRole('option', { name: /logs-\*/ })).not.toBeInTheDocument();
    });
    expect(getResourceList().getByRole('option', { name: /errors_view/ })).toBeInTheDocument();
    expect(getResourceList().getByRole('option', { name: /latency_view/ })).toBeInTheDocument();
  });

  it('excludes views when another source type is selected', async () => {
    renderBrowser();

    await getResourceList().findByRole('option', { name: /errors_view/ });

    await clickTypeFilterOption('Stream');

    await waitFor(() => {
      expect(
        getResourceList().queryByRole('option', { name: /errors_view/ })
      ).not.toBeInTheDocument();
    });
    expect(getResourceList().getByRole('option', { name: /logs-\*/ })).toBeInTheDocument();
  });

  it('emits the view name so it can be inserted as an ES|QL source', async () => {
    const { onSelect } = renderBrowser();

    await userEvent.click(await getResourceList().findByRole('option', { name: /errors_view/ }));

    expect(onSelect).toHaveBeenCalledWith('errors_view', DataSourceSelectionChange.Add);
  });
});
