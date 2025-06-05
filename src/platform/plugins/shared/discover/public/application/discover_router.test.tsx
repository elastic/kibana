/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * This test file was converted from Enzyme to React Testing Library.
 * The tests maintain the same structure and assertions as the original Enzyme tests,
 * but use React Testing Library's approach for rendering and querying elements.
 *
 * For testing redirects, we mock the Redirect component from react-router-dom
 * to render an element with data attributes that we can query to verify the redirection.
 */

// Import React before any other imports
import React from 'react';

// Mock react-router-dom Redirect component to capture redirects
jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return {
    ...actual,
    Redirect: ({ to }: { to: string }) => {
      // Store the redirect location in a data attribute for testing
      return <div data-test-subj="redirect" data-redirect-to={to} />;
    },
  };
});

// Mock dependencies to avoid issues with external modules like monaco
jest.mock('@kbn/kibana-react-plugin/public', () => ({
  KibanaContextProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock the component dependencies
jest.mock('./context', () => ({
  ContextAppRoute: () => <div data-test-subj="context-app-route" />,
}));

jest.mock('./doc', () => ({
  SingleDocRoute: () => <div data-test-subj="single-doc-route" />,
}));

jest.mock('./main', () => ({
  DiscoverMainRoute: () => <div data-test-subj="discover-main-route" />,
}));

jest.mock('./view_alert', () => ({
  ViewAlertRoute: () => <div data-test-subj="view-alert-route" />,
}));

jest.mock('./not_found', () => ({
  NotFoundRoute: () => <div data-test-subj="not-found-route" />,
}));

// Import testing utilities after mocks
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DiscoverRoutes } from './discover_router';
import { mockCustomizationContext } from '../customizations/__mocks__/customization_context';

const renderWithRouter = (path: string) => {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <DiscoverRoutes customizationContext={mockCustomizationContext} />
    </MemoryRouter>
  );
};

describe('DiscoverRouter', () => {
  it('should show DiscoverMainRoute component for / route', () => {
    renderWithRouter('/');
    expect(screen.getByTestId('discover-main-route')).toBeInTheDocument();
  });

  it('should show DiscoverMainRoute component for /view/:id route', () => {
    renderWithRouter('/view/test-id');
    expect(screen.getByTestId('discover-main-route')).toBeInTheDocument();
  });

  it('should redirect from /doc/:dataView/:index/:type to /doc/:dataView/:index', () => {
    // Render with a path that should trigger the redirect
    renderWithRouter('/doc/123/456/type');

    // Check that a redirect component was rendered with the correct "to" prop
    const redirectElement = screen.getByTestId('redirect');
    expect(redirectElement).toBeInTheDocument();
    expect(redirectElement.getAttribute('data-redirect-to')).toBe('/doc/123/456');
  });

  it('should show SingleDocRoute component for /doc/:dataViewId/:index route', () => {
    renderWithRouter('/doc/test-dataview/test-index');
    expect(screen.getByTestId('single-doc-route')).toBeInTheDocument();
  });

  it('should show ContextAppRoute component for /context/:dataViewId/:id route', () => {
    renderWithRouter('/context/test-dataview/test-id');
    expect(screen.getByTestId('context-app-route')).toBeInTheDocument();
  });
});
