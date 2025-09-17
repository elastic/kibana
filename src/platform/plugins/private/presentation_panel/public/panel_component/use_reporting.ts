/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect, useMemo, useRef, useState } from 'react';

export function useReporting({
  apiReady,
  blockingError,
  dataLoading,
  description,
  rendered,
  title,
}: {
  apiReady: boolean;
  blockingError?: Error;
  dataLoading: boolean;
  description?: string;
  rendered: boolean;
  title?: string;
}) {
  const reportingRef = useRef<HTMLElement>();
  const prevRenderComplete = useRef(false);
  const [renderedCount, setRenderedCount] = useState(0);

  const renderComplete = useMemo(
    () => apiReady && !dataLoading && rendered,
    [apiReady, dataLoading, rendered]
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

    if (title) attributes['data-title'] = title;
    if (description) attributes['data-description'] = description;

    return attributes;
  }, [blockingError, description, renderComplete, renderedCount, title]);

  return {
    reportingAttributes,
    reportingRef,
  };
}
