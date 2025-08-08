/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { BehaviorSubject } from 'rxjs';
import { screen, render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { createStubDataView, stubLogstashFieldSpecMap } from '@kbn/data-views-plugin/common/stubs';
import { stubIndexPattern } from '@kbn/data-plugin/public/stubs';
import { coreMock } from '@kbn/core/public/mocks';
import type { DataView } from '@kbn/data-views-plugin/common';
import { ESQLMenuPopover } from './esql_menu_popover';

const startMock = coreMock.createStart();
// Mock the necessary services
startMock.chrome.getActiveSolutionNavId$.mockReturnValue(new BehaviorSubject('oblt'));
const httpModule = {
  http: {
    get: jest.fn().mockResolvedValue({ recommendedQueries: [] }), // Mock the HTTP GET request
  },
};
const services = {
  docLinks: startMock.docLinks,
  http: httpModule.http,
  chrome: startMock.chrome,
};

describe('ESQLMenuPopover', () => {
  const renderESQLPopover = (adHocDataview?: DataView) => {
    return render(
      <KibanaContextProvider services={services}>
        <ESQLMenuPopover adHocDataview={adHocDataview} />
      </KibanaContextProvider>
    );
  };

  beforeEach(() => {
    // Reset mocks before each test
    httpModule.http.get.mockClear();
  });

  it('should render a button', () => {
    renderESQLPopover();
    expect(screen.getByTestId('esql-menu-button')).toBeInTheDocument();
  });

  it('should open a menu when the popover is open', async () => {
    renderESQLPopover();
    expect(screen.getByTestId('esql-menu-button')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button'));
    expect(screen.getByTestId('esql-quick-reference')).toBeInTheDocument();
    expect(screen.queryByTestId('esql-recommended-queries')).not.toBeInTheDocument();
    expect(screen.getByTestId('esql-about')).toBeInTheDocument();
    expect(screen.getByTestId('esql-feedback')).toBeInTheDocument();
  });

  it('should have recommended queries if a dataview is passed', async () => {
    renderESQLPopover(stubIndexPattern);
    await userEvent.click(screen.getByRole('button'));
    expect(screen.queryByTestId('esql-recommended-queries')).toBeInTheDocument();
  });

  it('should fetch ESQL extensions when activeSolutionId and queryForRecommendedQueries are present and the popover is open', async () => {
    const mockQueries = [
      { name: 'Count of logs', query: 'FROM logstash1 | STATS COUNT()' },
      { name: 'Average bytes', query: 'FROM logstash2 | STATS AVG(bytes) BY log.level' },
    ];

    // Configure the mock to resolve with mockQueries
    httpModule.http.get.mockResolvedValueOnce({ recommendedQueries: mockQueries });

    renderESQLPopover(stubIndexPattern);
    const esqlQuery = `FROM ${stubIndexPattern.name}`;

    // Assert that http.get was called with the correct URL
    await waitFor(() => {
      expect(httpModule.http.get).toHaveBeenCalledTimes(1);
      expect(httpModule.http.get).toHaveBeenCalledWith(
        `/internal/esql_registry/extensions/oblt/${esqlQuery}`
      );
    });

    // open the popover and check for recommended queries
    await userEvent.click(screen.getByRole('button'));
    expect(screen.queryByTestId('esql-recommended-queries')).toBeInTheDocument();
    // Open the nested section to see the recommended queries
    await waitFor(() => userEvent.click(screen.getByTestId('esql-recommended-queries')));

    await waitFor(() => {
      expect(screen.getByText('Count of logs')).toBeInTheDocument();
      expect(screen.getByText('Average bytes')).toBeInTheDocument();
      expect(screen.getByText('Identify patterns')).toBeInTheDocument();
    });
  });

  it('should handle API call failure gracefully', async () => {
    // Configure the mock to reject with an error
    httpModule.http.get.mockRejectedValueOnce(new Error('Network error'));

    renderESQLPopover(stubIndexPattern);
    // Assert that http.get was called (even if it failed)
    await waitFor(() => {
      expect(httpModule.http.get).toHaveBeenCalledTimes(1);
    });

    // The catch block does nothing, so we assert that no error is thrown
    // and that the static recommended queries are still shown.
    await userEvent.click(screen.getByRole('button'));
    expect(screen.queryByTestId('esql-recommended-queries')).toBeInTheDocument();
  });

  it('should show identify patterns recommended query', async () => {
    const stubLogstashDataView = createStubDataView({
      spec: {
        id: 'logstash-*',
        title: 'logstash-*',
        timeFieldName: 'time',
        fields: {
          ...stubLogstashFieldSpecMap,
          message: {
            name: 'message',
            type: 'string',
            esTypes: ['text'],
            aggregatable: true,
            searchable: true,
            count: 0,
            readFromDocValues: true,
            scripted: false,
            isMapped: true,
          },
        },
      },
    });

    renderESQLPopover(stubLogstashDataView);

    // open the popover and check for recommended queries
    await userEvent.click(screen.getByRole('button'));
    expect(screen.queryByTestId('esql-recommended-queries')).toBeInTheDocument();
    // Open the nested section to see the recommended queries
    await waitFor(() => userEvent.click(screen.getByTestId('esql-recommended-queries')));

    await waitFor(() => {
      expect(screen.getByText('Identify patterns')).toBeInTheDocument();
    });
  });
});
