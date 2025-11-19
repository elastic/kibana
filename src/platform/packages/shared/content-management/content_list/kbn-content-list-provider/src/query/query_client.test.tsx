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
import { useQueryClient, type QueryClient } from '@kbn/react-query';
import {
  contentListQueryClient,
  QueryClientProvider as ContentListQueryClientProvider,
} from './query_client';

describe('query_client', () => {
  describe('contentListQueryClient', () => {
    it('should create a QueryClient instance', () => {
      expect(contentListQueryClient).toBeDefined();
      expect(typeof contentListQueryClient.getQueryData).toBe('function');
      expect(typeof contentListQueryClient.setQueryData).toBe('function');
    });

    it('should have retry disabled by default', () => {
      const defaultOptions = contentListQueryClient.getDefaultOptions();
      expect(defaultOptions.queries?.retry).toBe(false);
    });

    it('should expose standard QueryClient methods', () => {
      // Verify essential QueryClient methods are available.
      expect(typeof contentListQueryClient.invalidateQueries).toBe('function');
      expect(typeof contentListQueryClient.clear).toBe('function');
      expect(typeof contentListQueryClient.fetchQuery).toBe('function');
      expect(typeof contentListQueryClient.prefetchQuery).toBe('function');
    });
  });

  describe('QueryClientProvider', () => {
    it('should render children', () => {
      const { container } = render(
        <ContentListQueryClientProvider client={contentListQueryClient}>
          <div data-test-subj="test-child">Test Content</div>
        </ContentListQueryClientProvider>
      );

      expect(container.querySelector('[data-test-subj="test-child"]')).toBeInTheDocument();
    });

    it('should provide QueryClient to children via context', () => {
      let receivedClient: QueryClient | undefined;

      const TestComponent = () => {
        receivedClient = useQueryClient();
        return <div data-test-subj="test">Test</div>;
      };

      render(
        <ContentListQueryClientProvider client={contentListQueryClient}>
          <TestComponent />
        </ContentListQueryClientProvider>
      );

      expect(receivedClient).toBe(contentListQueryClient);
    });

    it('should allow nested components to access QueryClient', () => {
      let clientFromNested: QueryClient | undefined;

      const NestedComponent = () => {
        clientFromNested = useQueryClient();
        return <span>Nested</span>;
      };

      const ParentComponent = () => (
        <div>
          <NestedComponent />
        </div>
      );

      render(
        <ContentListQueryClientProvider client={contentListQueryClient}>
          <ParentComponent />
        </ContentListQueryClientProvider>
      );

      expect(clientFromNested).toBe(contentListQueryClient);
    });
  });
});
