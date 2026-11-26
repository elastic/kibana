/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook } from '@testing-library/react';
import React from 'react';
import { analyticsServiceMock } from '@kbn/core/public/mocks';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import type { Template } from '@kbn/workflows-library';
import { useTemplateLoadFailedTelemetry } from './use_template_load_failed_telemetry';
import { testQueryClientConfig } from '../../test_utils';
import { CATALOG_QUERY_KEY } from '../hooks/use_catalog';

const httpError = (status: number) =>
  Object.assign(new Error(`Request failed with ${status}`), {
    name: 'HttpFetchError',
    request: {},
    response: { status },
  });

describe('useTemplateLoadFailedTelemetry', () => {
  let analytics: ReturnType<typeof analyticsServiceMock.createAnalyticsServiceStart>;
  let queryClient: QueryClient;

  const renderLoadFailed = (slug: string, error: unknown) =>
    renderHook(
      ({ currentError }: { currentError: unknown }) =>
        useTemplateLoadFailedTelemetry(slug, currentError),
      {
        initialProps: { currentError: error },
        wrapper: ({ children }) => (
          <KibanaContextProvider services={{ analytics }}>
            <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
          </KibanaContextProvider>
        ),
      }
    );

  beforeEach(() => {
    analytics = analyticsServiceMock.createAnalyticsServiceStart();
    queryClient = new QueryClient(testQueryClientConfig);
  });

  it('reports nothing while the template loads', () => {
    renderLoadFailed('triage-alerts', null);

    expect(analytics.reportEvent).not.toHaveBeenCalled();
  });

  it('reports a missing template without its slug', () => {
    queryClient.setQueryData<Template[]>(CATALOG_QUERY_KEY, [
      { slug: 'triage-alerts' } as Template,
    ]);

    renderLoadFailed('triage-alerts', httpError(404));

    expect(analytics.reportEvent).toHaveBeenCalledWith('workflows_template_load_failed', {
      errorType: 'template_not_found',
    });
  });

  it('reports a failed fetch with the slug when the cached catalog lists it', () => {
    queryClient.setQueryData<Template[]>(CATALOG_QUERY_KEY, [
      { slug: 'triage-alerts' } as Template,
    ]);

    renderLoadFailed('triage-alerts', httpError(503));

    expect(analytics.reportEvent).toHaveBeenCalledWith('workflows_template_load_failed', {
      errorType: 'fetch_failed',
      templateSlug: 'triage-alerts',
    });
  });

  it('reports a failed fetch without the slug when no cached catalog lists it', () => {
    renderLoadFailed('acme-escalation', httpError(503));

    expect(analytics.reportEvent).toHaveBeenCalledWith('workflows_template_load_failed', {
      errorType: 'fetch_failed',
    });
  });

  it('reports once per slug, even when a refetch fails again', () => {
    const { rerender } = renderLoadFailed('triage-alerts', httpError(503));

    rerender({ currentError: httpError(503) });

    expect(analytics.reportEvent).toHaveBeenCalledTimes(1);
  });
});
