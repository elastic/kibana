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
import { userEvent } from '@testing-library/user-event';
import type { SavedObjectRelation } from '@kbn/saved-objects-management-plugin/public';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import {
  DeleteModalContent,
  relationshipCalloutText,
  spacesWarningText,
} from './delete_data_view_flyout_content';
import type { RemoveDataViewProps } from '../edit_index_pattern';
import { mockManagementPlugin } from '../../mocks';

const mockViews: RemoveDataViewProps[] = [
  {
    id: '1',
    getName: () => 'Data View 1',
    namespaces: ['default'],
  } as any,
  {
    id: '2',
    getName: () => 'Data View 2',
    namespaces: ['*'],
  } as any,
];

const mockRelationships: Record<string, SavedObjectRelation[]> = {
  '1': [
    {
      id: 'rel-1',
      type: 'dashboard',
      meta: {
        title: 'Dashboard 1',
        inAppUrl: { path: '/app/dashboards#/view/rel-1', uiCapabilitiesPath: '' },
      },
    } as SavedObjectRelation,
  ],
  '2': [],
};

describe('DeleteModalContent', () => {
  let reviewedItems: Set<string>;
  let setReviewedItems: jest.Mock;

  beforeEach(() => {
    reviewedItems = new Set();
    setReviewedItems = jest.fn();
  });

  const renderContent = (
    overrides: Partial<React.ComponentProps<typeof DeleteModalContent>> = {},
    context = mockManagementPlugin.createIndexPatternManagmentContext()
  ) =>
    render(
      <IntlProvider>
        <KibanaContextProvider services={context}>
          <DeleteModalContent
            views={mockViews}
            hasSpaces={true}
            relationships={mockRelationships}
            reviewedItems={reviewedItems}
            setReviewedItems={setReviewedItems}
            {...overrides}
          />
        </KibanaContextProvider>
      </IntlProvider>
    );

  it('renders warning callout when no relationships', () => {
    renderContent({ relationships: { '1': [], '2': [] } });
    expect(screen.getByText(spacesWarningText)).toBeVisible();
    expect(screen.getByText(/Successfully deleted 2 data views/i)).toBeVisible();
  });

  it('renders danger callout when relationships exist', () => {
    renderContent();
    expect(screen.getByText(relationshipCalloutText)).toBeVisible();
  });

  it('renders table with data view names and spaces', () => {
    renderContent();
    expect(screen.getByText('Data View 1')).toBeVisible();
    expect(screen.getByText('Data View 2')).toBeVisible();
    expect(screen.getByText('all')).toBeVisible();
    expect(screen.getByText('1')).toBeVisible();
  });

  it('shows "Review" button for views with relationships', () => {
    renderContent();
    expect(screen.getAllByText('Review').length).toBe(1);
  });

  it('expands relationship details when "Review" is clicked', async () => {
    renderContent();
    await userEvent.click(screen.getByRole('button', { name: /Expand/i }));
    expect(screen.getByText('Dashboard 1')).toBeVisible();
    expect(setReviewedItems).toHaveBeenCalled();
  });

  it('renders related object links with the current space basePath', async () => {
    const context = mockManagementPlugin.createIndexPatternManagmentContext();
    context.http = httpServiceMock.createStartContract({ basePath: '/s/space-a' });

    renderContent({}, context);
    await userEvent.click(screen.getByRole('button', { name: /Expand/i }));

    expect(screen.getByText('Dashboard 1').closest('a')).toHaveAttribute(
      'href',
      '/s/space-a/app/dashboards#/view/rel-1'
    );
  });

  it('renders without spaces column if hasSpaces is false', () => {
    renderContent({ hasSpaces: false });
    expect(screen.queryByText('Spaces')).not.toBeInTheDocument();
  });
});
