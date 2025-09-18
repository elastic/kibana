/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  apiPublishesRendered,
  useBatchedOptionalPublishingSubjects,
} from '@kbn/presentation-publishing';
import type { DefaultEmbeddableApi } from './types';

export function useReportingItem<
  SerializedState extends object = object,
  Api extends DefaultEmbeddableApi<SerializedState> = DefaultEmbeddableApi<SerializedState>
>(api?: Api) {
  const reportingRef = useRef<HTMLElement>();
  const prevRenderComplete = useRef(false);
  const [renderedCount, setRenderedCount] = useState(0);

  const [
    dataLoading,
    rendered,
    blockingError,
    title,
    description,
    defaultTitle,
    defaultDescription,
  ] = useBatchedOptionalPublishingSubjects(
    api?.dataLoading$,
    apiPublishesRendered(api) ? api.rendered$ : undefined,
    api?.blockingError$,
    api?.title$,
    api?.description$,
    api?.defaultTitle$,
    api?.defaultDescription$
  );

  const renderComplete = useMemo(
    () => Boolean(api) && !(dataLoading ?? false) && (rendered ?? true),
    [api, dataLoading, rendered]
  );

  useEffect(() => {
    if (!prevRenderComplete.current && renderComplete) {
      setRenderedCount(renderedCount + 1);
      if (reportingRef.current)
        reportingRef.current.dispatchEvent(new CustomEvent('renderComplete', { bubbles: true }));
    }

    prevRenderComplete.current = renderComplete;
  }, [renderComplete, renderedCount]);

  const reportingAttributes = useMemo(() => {
    const attributes: { [key: string]: unknown } = {
      'data-render-complete': Boolean(blockingError) || renderComplete,
      'data-rendering-count': renderedCount,
      'data-shared-item': '',
    };

    if (title || defaultTitle) attributes['data-title'] = title ?? defaultTitle;
    if (description || defaultDescription)
      attributes['data-description'] = description ?? defaultDescription;

    return attributes;
  }, [
    blockingError,
    defaultDescription,
    defaultTitle,
    description,
    renderComplete,
    renderedCount,
    title,
  ]);

  return {
    reportingAttributes,
    reportingRef,
  };
}
