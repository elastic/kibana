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
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { deleteModalMsg } from './delete_modal_msg';
import type { RemoveDataViewProps } from '../edit_index_pattern';
import type { SavedObjectRelation } from '@kbn/saved-objects-management-plugin/public';

function getMockView(id: string, name: string, namespaces: string[] = []) {
  return {
    id,
    getName: () => name,
    namespaces,
  } as RemoveDataViewProps;
}

function renderComponent(component: React.ReactElement) {
  return render(<IntlProvider>{component}</IntlProvider>);
}

describe('deleteModalMsg', () => {
  it('renders warning callout and summary', () => {
    const views = [getMockView('1', 'Test Data View')];
    const relationships: Record<string, SavedObjectRelation[]> = { '1': [] };

    renderComponent(deleteModalMsg({ views, hasSpaces: false, relationships }));

    expect(
      screen.getByText(
        /Deleting a data view affects every saved object that uses it, and it is deleted from every space it is shared in/i
      )
    ).toBeInTheDocument();
    expect(screen.getByText(/You'll permanently delete 1 data view/i)).toBeInTheDocument();
    expect(screen.getByText(/Test Data View/)).toBeInTheDocument();
  });

  it('renders spaces column if hasSpaces is true', () => {
    const views = [getMockView('1', 'Test Data View', ['default', 'space2'])];
    const relationships: Record<string, SavedObjectRelation[]> = { '1': [] };

    renderComponent(deleteModalMsg({ views, hasSpaces: true, relationships }));

    expect(screen.getByText(/Spaces/i)).toBeInTheDocument();
    // Should show the number of spaces
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('shows "all" if namespaces contains *', () => {
    const views = [getMockView('1', 'Test Data View', ['*'])];
    const relationships: Record<string, SavedObjectRelation[]> = { '1': [] };

    renderComponent(deleteModalMsg({ views, hasSpaces: true, relationships }));

    expect(screen.getByText(/all/i)).toBeInTheDocument();
    expect(screen.queryByText(/One or more data views are used by other objects/i)).toBeNull();
  });

  it('renders danger callout if any relationships exist', () => {
    const views = [getMockView('1', 'Test Data View')];
    const relationships: Record<string, SavedObjectRelation[]> = {
      '1': [
        {
          id: 'rel1',
          type: 'dashboard',
          meta: { title: 'Dashboard 1', inAppUrl: { path: '/dash/1', uiCapabilitiesPath: '' } },
          relationship: 'parent',
        },
      ],
    };

    renderComponent(deleteModalMsg({ views, hasSpaces: false, relationships }));

    expect(
      screen.getByText(/One or more data views are used by other objects/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/Review/)).toBeInTheDocument();
  });

  it('expands and collapses relationship details', async () => {
    const views = [getMockView('1', 'Test Data View')];
    const relationships: Record<string, SavedObjectRelation[]> = {
      '1': [
        {
          id: 'rel1',
          type: 'dashboard',
          meta: { title: 'Dashboard 1', inAppUrl: { path: '/dash/1', uiCapabilitiesPath: '' } },
          relationship: 'parent',
        },
      ],
    };

    renderComponent(deleteModalMsg({ views, hasSpaces: false, relationships }));

    const reviewButton = screen.getByRole('button', { name: /Expand/i });
    fireEvent.click(reviewButton);

    // Relationship table should now be visible
    expect(screen.getByText('Dashboard 1')).toBeInTheDocument();
    expect(screen.getByText('dashboard')).toBeInTheDocument();

    // Collapse again
    fireEvent.click(screen.getByRole('button', { name: /Collapse/i }));
    expect(screen.queryByText('Dashboard 1')).toBeNull();
  });
});
