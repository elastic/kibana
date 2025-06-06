/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render } from '@testing-library/react';

// Mock react-intl components
jest.mock('@kbn/i18n-react', () => ({
  FormattedMessage: ({ defaultMessage }: { defaultMessage?: string }) => <span>{defaultMessage}</span>,
}));

// Mock EUI components to avoid theme context issues
jest.mock('@elastic/eui', () => {
  const actual = jest.requireActual('@elastic/eui');
  return {
    ...actual,
    EuiFlyout: ({ children, ...props }: React.PropsWithChildren<unknown>) => (
      <div {...props}>{children}</div>
    ),
    EuiFlyoutHeader: ({ children }: React.PropsWithChildren<unknown>) => <div>{children}</div>,
    EuiFlyoutBody: ({ children }: React.PropsWithChildren<unknown>) => <div>{children}</div>,
    EuiFlyoutFooter: ({ children }: React.PropsWithChildren<unknown>) => <div>{children}</div>,
    EuiTitle: ({ children }: React.PropsWithChildren<unknown>) => <div>{children}</div>,
    EuiButton: ({ children, ...props }: React.PropsWithChildren<unknown>) => (
      <button {...props}>{children}</button>
    ),
    EuiFlexGroup: ({ children }: React.PropsWithChildren<unknown>) => <div>{children}</div>,
    EuiFlexItem: ({ children }: React.PropsWithChildren<unknown>) => <div>{children}</div>,
  };
});

// Mock SavedObjectFinder to avoid complex dependencies
jest.mock('@kbn/saved-objects-finder-plugin/public', () => ({
  SavedObjectFinder: ({ children }: { children?: React.ReactNode }) => (
    <div data-test-subj="savedObjectFinder">{children}</div>
  ),
}));

describe('OpenSearchPanel', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  test('render', async () => {
    jest.doMock('../../../../hooks/use_discover_services', () => ({
      useDiscoverServices: jest.fn().mockImplementation(() => ({
        addBasePath: (path: string) => path,
        capabilities: { savedObjectsManagement: { edit: true } },
        savedObjectsTagging: {},
        contentClient: {},
        uiSettings: {},
      })),
    }));
    const { OpenSearchPanel } = await import('./open_search_panel');

    const { container } = render(
      <OpenSearchPanel onClose={jest.fn()} onOpenSavedSearch={jest.fn()} />
    );
    expect(container.firstChild).toMatchSnapshot();
  });

  test('should not render manage searches button without permissions', async () => {
    jest.doMock('../../../../hooks/use_discover_services', () => ({
      useDiscoverServices: jest.fn().mockImplementation(() => ({
        addBasePath: (path: string) => path,
        capabilities: { savedObjectsManagement: { edit: false, delete: false } },
        savedObjectsTagging: {},
        contentClient: {},
        uiSettings: {},
      })),
    }));
    const { OpenSearchPanel } = await import('./open_search_panel');

    const { queryByTestId } = render(
      <OpenSearchPanel onClose={jest.fn()} onOpenSavedSearch={jest.fn()} />
    );
    expect(queryByTestId('manageSearches')).not.toBeInTheDocument();
  });
});
