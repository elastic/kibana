/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import type { SavedObjectRelation } from '@kbn/saved-objects-management-plugin/public';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import {
  DeleteModalContent,
  relationshipCalloutText,
  spacesWarningText,
} from './delete_data_view_flyout_content';
import type { RemoveDataViewProps } from '../edit_index_pattern';

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

  it('renders warning callout when no relationships', () => {
    render(
      <IntlProvider>
        <DeleteModalContent
          views={mockViews}
          hasSpaces={true}
          relationships={{ '1': [], '2': [] }}
          reviewedItems={reviewedItems}
          setReviewedItems={setReviewedItems}
        />
      </IntlProvider>
    );
    expect(screen.getByText(spacesWarningText)).toBeInTheDocument();
    expect(screen.getByText(/Successfully deleted 2 data views/i)).toBeInTheDocument();
  });

  it('renders danger callout when relationships exist', () => {
    render(
      <IntlProvider>
        <DeleteModalContent
          views={mockViews}
          hasSpaces={true}
          relationships={mockRelationships}
          reviewedItems={reviewedItems}
          setReviewedItems={setReviewedItems}
        />
      </IntlProvider>
    );
    expect(screen.getByText(relationshipCalloutText)).toBeInTheDocument();
  });

  it('renders table with data view names and spaces', () => {
    render(
      <IntlProvider>
        <DeleteModalContent
          views={mockViews}
          hasSpaces={true}
          relationships={mockRelationships}
          reviewedItems={reviewedItems}
          setReviewedItems={setReviewedItems}
        />
      </IntlProvider>
    );
    expect(screen.getByText('Data View 1')).toBeInTheDocument();
    expect(screen.getByText('Data View 2')).toBeInTheDocument();
    expect(screen.getByText('all')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('shows "Review" button for views with relationships', () => {
    render(
      <IntlProvider>
        <DeleteModalContent
          views={mockViews}
          hasSpaces={true}
          relationships={mockRelationships}
          reviewedItems={reviewedItems}
          setReviewedItems={setReviewedItems}
        />
      </IntlProvider>
    );
    expect(screen.getAllByText('Review').length).toBe(1);
  });

  it('expands relationship details when "Review" is clicked', () => {
    render(
      <IntlProvider>
        <DeleteModalContent
          views={mockViews}
          hasSpaces={true}
          relationships={mockRelationships}
          reviewedItems={reviewedItems}
          setReviewedItems={setReviewedItems}
        />
      </IntlProvider>
    );
    const reviewBtn = screen.getByRole('button', { name: /Expand/i });
    fireEvent.click(reviewBtn);
    expect(screen.getByText('Dashboard 1')).toBeInTheDocument();
    expect(setReviewedItems).toHaveBeenCalled();
  });

  it('renders without spaces column if hasSpaces is false', () => {
    render(
      <IntlProvider>
        <DeleteModalContent
          views={mockViews}
          hasSpaces={false}
          relationships={mockRelationships}
          reviewedItems={reviewedItems}
          setReviewedItems={setReviewedItems}
        />
      </IntlProvider>
    );
    expect(screen.queryByText('Spaces')).not.toBeInTheDocument();
  });
});
