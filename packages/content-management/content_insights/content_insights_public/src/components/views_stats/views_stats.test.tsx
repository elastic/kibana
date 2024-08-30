/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { render, within } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { ContentInsightsProvider } from '../../services';

import { ViewsStats } from './views_stats';

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2024-07-15T14:00:00.00Z'));
});
afterEach(() => jest.clearAllMocks());
afterAll(() => jest.useRealTimers());

const mockStats = jest.fn().mockResolvedValue({
  from: '2024-05-01T00:00:00.000Z',
  count: 10,
  daily: [
    {
      date: '2024-05-01T00:00:00.000Z',
      count: 5,
    },
    {
      date: '2024-06-01T00:00:00.000Z',
      count: 5,
    },
  ],
});

const WrappedViewsStats = () => {
  const item = { id: '1' } as any;
  const client = {
    track: jest.fn(),
    getStats: mockStats,
  };
  return (
    <I18nProvider>
      <QueryClientProvider client={new QueryClient()}>
        <ContentInsightsProvider contentInsightsClient={client}>
          <ViewsStats item={item} />
        </ContentInsightsProvider>
      </QueryClientProvider>
    </I18nProvider>
  );
};

describe('ViewsStats', () => {
  test('should render the total views and chart', async () => {
    const { getByTestId } = render(<WrappedViewsStats />);
    const totalViews = getByTestId('views-stats-total-views');
    expect(totalViews).toBeInTheDocument();
    await within(totalViews).findByText('Views (last 75 days)');
    await within(totalViews).findByText('10');
  });
});
