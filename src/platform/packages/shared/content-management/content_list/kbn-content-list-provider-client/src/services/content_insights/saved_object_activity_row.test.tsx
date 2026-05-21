/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import type { ContentInsightsClientPublic } from '@kbn/content-management-content-insights-public';
import type { UserContentCommonSchema } from '@kbn/content-management-table-list-view-common';
import { SavedObjectActivityRow } from './saved_object_activity_row';

jest.mock('@kbn/content-management-content-insights-public', () => ({
  ContentInsightsProvider: ({
    contentInsightsClient,
    children,
  }: {
    contentInsightsClient: unknown;
    children: React.ReactNode;
  }) => (
    <div
      data-test-subj="contentInsightsProvider"
      data-client-id={(contentInsightsClient as { id?: string })?.id ?? ''}
    >
      {children}
    </div>
  ),
  ActivityView: ({ entityNamePlural }: { entityNamePlural?: string }) => (
    <div data-test-subj="activityView">activity:{entityNamePlural}</div>
  ),
  ViewsStats: ({ item }: { item: { id: string } }) => (
    <div data-test-subj="viewsStats">views:{item.id}</div>
  ),
}));

describe('SavedObjectActivityRow', () => {
  const service = { id: 'svc-1' } as unknown as ContentInsightsClientPublic;
  const item = {
    id: 'item-a',
    type: 'dashboard',
    references: [],
    updatedAt: '2024-01-01',
    attributes: { title: 'A' },
  } as UserContentCommonSchema;

  it('renders ActivityView and ViewsStats inside a ContentInsightsProvider seeded with the supplied service', () => {
    render(
      <IntlProvider locale="en">
        <SavedObjectActivityRow service={service} item={item} entityNamePlural="dashboards" />
      </IntlProvider>
    );

    const provider = screen.getByTestId('contentInsightsProvider');
    expect(provider).toBeInTheDocument();
    expect(provider.dataset.clientId).toBe('svc-1');
    expect(screen.getByTestId('activityView')).toHaveTextContent('activity:dashboards');
    expect(screen.getByTestId('viewsStats')).toHaveTextContent('views:item-a');
  });
});
