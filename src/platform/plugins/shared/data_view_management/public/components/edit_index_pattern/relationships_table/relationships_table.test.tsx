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
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { spacesPluginMock } from '@kbn/spaces-plugin/public/mocks';
import type { SavedObjectRelation } from '@kbn/saved-objects-management-plugin/public';
import { RelationshipsTable } from './relationships_table';

const relationships: Array<SavedObjectRelation & { title: string }> = [
  {
    id: 'rel-1',
    type: 'dashboard',
    relationship: 'parent',
    managed: false,
    references: [],
    title: 'Dashboard 1',
    meta: {
      title: 'Dashboard 1',
      inAppUrl: { path: '/app/dashboards#/view/rel-1', uiCapabilitiesPath: '' },
    },
    namespaces: ['space-b'],
  },
];

const renderTable = (overrides: Partial<React.ComponentProps<typeof RelationshipsTable>> = {}) => {
  const basePath = httpServiceMock.createBasePath({ serverBasePath: '' });
  basePath.get.mockReturnValue('/s/space-a');

  return render(
    <IntlProvider>
      <RelationshipsTable
        basePath={basePath}
        capabilities={{} as any}
        id="target-id"
        navigateToUrl={jest.fn()}
        getDefaultTitle={() => 'Untitled'}
        getSavedObjectLabel={() => 'Dashboard'}
        relationships={relationships}
        allowedTypes={[]}
        {...overrides}
      />
    </IntlProvider>
  );
};

describe('RelationshipsTable', () => {
  it('does not render a Spaces column when the spaces plugin is unavailable', () => {
    renderTable();
    expect(screen.queryByText('Spaces')).not.toBeInTheDocument();
  });

  it('renders a Spaces column and links to the correct space when a relation lives elsewhere', () => {
    const spacesApi = spacesPluginMock.createStartContract();
    (spacesApi.ui.components.getSpacesContextProvider as jest.Mock).mockImplementation(
      ({ children }: React.PropsWithChildren<{}>) => <>{children}</>
    );
    (spacesApi.ui.components.getSpaceList as jest.Mock).mockImplementation(
      ({ namespaces }: { namespaces: string[] }) => (
        <span data-test-subj="spaceList">{namespaces.join(',')}</span>
      )
    );

    renderTable({ spacesApi, targetNamespaces: ['space-a', 'space-b'] });

    expect(screen.getByText('Spaces')).toBeVisible();
    expect(screen.getByTestId('spaceList')).toHaveTextContent('space-b');
    expect(screen.getByText('Dashboard 1').closest('a')).toHaveAttribute(
      'href',
      '/s/space-b/app/dashboards#/view/rel-1'
    );
  });
});
