/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import React from 'react';
import '@testing-library/jest-dom';
import { BehaviorSubject } from 'rxjs';
import { screen, render, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { createStubDataView, stubLogstashFieldSpecMap } from '@kbn/data-plugin/public/stubs';
import { stubIndexPattern } from '@kbn/data-plugin/public/stubs';
import { coreMock, notificationServiceMock } from '@kbn/core/public/mocks';
import type { DataView } from '@kbn/data-plugin/common';
import { HelpPopover } from './help_popover';
import { getESQLAdHocDataview } from '@kbn/esql-utils';

jest.mock('@kbn/esql-utils', () => ({
  ...jest.requireActual('@kbn/esql-utils'),
  getESQLAdHocDataview: jest.fn(),
}));

jest.mock('../editor_actions_context', () => ({
  useEsqlEditorActions: () => ({
    currentQuery: 'FROM logstash-*',
    submitEsqlQuery: jest.fn(),
  }),
}));

const startMock = coreMock.createStart();
const notificationsMock = notificationServiceMock.createStartContract();

startMock.chrome.getActiveSolutionNavId$.mockReturnValue(new BehaviorSubject('oblt'));
startMock.http.get = jest.fn().mockResolvedValue({ recommendedQueries: [] });
startMock.notifications = notificationsMock;

const services = {
  core: startMock,
  data: {
    dataViews: {},
  },
};

describe('HelpPopover', () => {
  const renderHelpPopover = async (adHocDataView?: DataView | null) => {
    (getESQLAdHocDataview as jest.Mock).mockResolvedValue(adHocDataView ?? null);
    return await act(async () => {
      render(
        <KibanaContextProvider services={services as any}>
          <HelpPopover />
        </KibanaContextProvider>
      );
    });
  };

  beforeEach(() => {
    startMock.http.get.mockClear();
    (getESQLAdHocDataview as jest.Mock).mockClear();
    notificationsMock.feedback.isEnabled.mockReturnValue(true);
  });

  it('should render a button', async () => {
    await renderHelpPopover();
    expect(screen.getByTestId('esql-help-popover-button')).toBeInTheDocument();
  });

  it('should open a menu when the popover is open', async () => {
    await renderHelpPopover();
    await userEvent.click(screen.getByTestId('esql-help-popover-button'));
    expect(screen.getByTestId('esql-quick-reference')).toBeInTheDocument();
    expect(screen.queryByTestId('esql-recommended-queries')).not.toBeInTheDocument();
  });

  it('should have recommended queries if a dataview is available', async () => {
    await renderHelpPopover(stubIndexPattern);
    await userEvent.click(screen.getByTestId('esql-help-popover-button'));
    await waitFor(() => {
      expect(screen.queryByTestId('esql-recommended-queries')).toBeInTheDocument();
    });
  });

  it('should not have feedback if feedback is not enabled', async () => {
    notificationsMock.feedback.isEnabled.mockReturnValue(false);
    await renderHelpPopover(stubIndexPattern);
    await userEvent.click(screen.getByTestId('esql-help-popover-button'));
    expect(screen.queryByTestId('esql-feedback')).not.toBeInTheDocument();
  });

  it('should fetch ESQL extensions when activeSolutionId and queryForRecommendedQueries are present', async () => {
    const mockQueries = [
      { name: 'Count of logs', query: 'FROM logstash1 | STATS COUNT()' },
      { name: 'Average bytes', query: 'FROM logstash2 | STATS AVG(bytes) BY log.level' },
    ];

    startMock.http.get.mockResolvedValueOnce({ recommendedQueries: mockQueries });

    await renderHelpPopover(stubIndexPattern);
    const esqlQuery = `FROM ${stubIndexPattern.name}`;

    await userEvent.click(screen.getByTestId('esql-help-popover-button'));
    await waitFor(() => {
      expect(startMock.http.get).toHaveBeenCalledTimes(1);
      expect(startMock.http.get).toHaveBeenCalledWith(
        `/internal/esql_registry/extensions/oblt/${esqlQuery}`
      );
    });

    expect(screen.queryByTestId('esql-recommended-queries')).toBeInTheDocument();
    await waitFor(() => userEvent.click(screen.getByTestId('esql-recommended-queries')));

    await waitFor(() => {
      expect(screen.getByText('Count of logs')).toBeInTheDocument();
      expect(screen.getByText('Average bytes')).toBeInTheDocument();
      expect(screen.getByText('Identify patterns')).toBeInTheDocument();
    });
  });

  it('should handle API call failure gracefully', async () => {
    startMock.http.get.mockRejectedValueOnce(new Error('Network error'));

    await renderHelpPopover(stubIndexPattern);
    await userEvent.click(screen.getByTestId('esql-help-popover-button'));
    await waitFor(() => {
      expect(startMock.http.get).toHaveBeenCalledTimes(1);
    });

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

    await renderHelpPopover(stubLogstashDataView);
    await userEvent.click(screen.getByTestId('esql-help-popover-button'));
    expect(screen.queryByTestId('esql-recommended-queries')).toBeInTheDocument();
    await waitFor(() => userEvent.click(screen.getByTestId('esql-recommended-queries')));

    await waitFor(() => {
      expect(screen.getByText('Identify patterns')).toBeInTheDocument();
    });
  });
});
