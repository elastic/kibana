/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import React from 'react';
import { createMemoryHistory } from 'history';

// Mock dependencies to avoid issues with external modules like monaco
jest.mock('@kbn/kibana-react-plugin/public', () => ({
  KibanaContextProvider: ({ children }: { children: React.ReactNode }) => children,
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
import { Router } from '@kbn/shared-ux-router';
import { DiscoverRoutes } from './discover_router';
import { mockCustomizationContext } from '../customizations/__mocks__/customization_context';

const renderWithRouter = (path: string) => {
  const history = createMemoryHistory({
    initialEntries: [path],
  });
  render(
    <Router history={history}>
      <DiscoverRoutes customizationContext={mockCustomizationContext} />
    </Router>
  );

  return history;
};

describe('DiscoverRouter', () => {
  it('should show DiscoverMainRoute component for / route', () => {
    const history = renderWithRouter('/');
    expect(screen.getByTestId('discover-main-route')).toBeInTheDocument();
    expect(history.location.pathname).toBe('/');
  });

  it('should show DiscoverMainRoute component for /view/:id route', () => {
    const history = renderWithRouter('/view/test-id');
    expect(screen.getByTestId('discover-main-route')).toBeInTheDocument();
    expect(history.location.pathname).toBe('/view/test-id');
  });

  it('should redirect from /doc/:dataView/:index/:type to /doc/:dataView/:index', () => {
    // Render with a path that should trigger the redirect
    const history = renderWithRouter('/doc/123/456/type');
    expect(screen.getByTestId('single-doc-route')).toBeInTheDocument();
    expect(history.location.pathname).toBe('/doc/123/456');
  });

  it('should show SingleDocRoute component for /doc/:dataViewId/:index route', () => {
    const history = renderWithRouter('/doc/test-dataview/test-index');
    expect(screen.getByTestId('single-doc-route')).toBeInTheDocument();
    expect(history.location.pathname).toBe('/doc/test-dataview/test-index');
  });

  it('should show ContextAppRoute component for /context/:dataViewId/:id route', () => {
    const history = renderWithRouter('/context/test-dataview/test-id');
    expect(screen.getByTestId('context-app-route')).toBeInTheDocument();
    expect(history.location.pathname).toBe('/context/test-dataview/test-id');
  });
});
