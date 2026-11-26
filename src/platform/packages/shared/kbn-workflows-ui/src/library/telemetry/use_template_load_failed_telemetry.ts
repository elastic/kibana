/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@kbn/react-query';
import type { Template } from '@kbn/workflows-library';
import { useLibraryTelemetry } from './use_library_telemetry';
import { CATALOG_QUERY_KEY } from '../hooks/use_catalog';
import { isTemplateNotFoundError } from '../hooks/use_template';

/**
 * Reports a template page that can't show its template, once per slug. `error` is the
 * `useTemplate` error, which is only set once the request has failed after its retries.
 * The slug is sent only when the catalog the browser already loaded lists it.
 */
export const useTemplateLoadFailedTelemetry = (slug: string | undefined, error: unknown): void => {
  const telemetry = useLibraryTelemetry();
  const queryClient = useQueryClient();
  const reportedSlug = useRef<string | undefined>();

  useEffect(() => {
    if (!slug || !error || reportedSlug.current === slug) {
      return;
    }
    reportedSlug.current = slug;

    if (isTemplateNotFoundError(error)) {
      telemetry.reportTemplateLoadFailed({ errorType: 'template_not_found' });
      return;
    }
    const catalog = queryClient.getQueryData<Template[]>(CATALOG_QUERY_KEY);
    const isListed = catalog?.some((template) => template.slug === slug) ?? false;
    telemetry.reportTemplateLoadFailed({
      errorType: 'fetch_failed',
      ...(isListed ? { templateSlug: slug } : {}),
    });
  }, [slug, error, telemetry, queryClient]);
};
