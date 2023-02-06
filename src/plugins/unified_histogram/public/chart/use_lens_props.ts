/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { TimeRange } from '@kbn/data-plugin/common';
import { ViewMode } from '@kbn/embeddable-plugin/public';
import type { DefaultInspectorAdapters } from '@kbn/expressions-plugin/common';
import type { TypedLensByValueInput } from '@kbn/lens-plugin/public';
import { useCallback, useEffect, useState } from 'react';
import type { Observable } from 'rxjs';
import type { UnifiedHistogramInputMessage, UnifiedHistogramRequestContext } from '../types';
import { useStableCallback } from './use_stable_callback';

export const useLensProps = ({
  request,
  getTimeRange,
  refetch$,
  attributes,
  onLoad,
}: {
  request?: UnifiedHistogramRequestContext;
  getTimeRange: () => TimeRange;
  refetch$: Observable<UnifiedHistogramInputMessage>;
  attributes: TypedLensByValueInput['attributes'];
  onLoad: (isLoading: boolean, adapters: Partial<DefaultInspectorAdapters> | undefined) => void;
}) => {
  const buildLensProps = useCallback(
    () =>
      getLensProps({
        searchSessionId: request?.searchSessionId,
        getTimeRange,
        attributes,
        onLoad,
      }),
    [attributes, getTimeRange, onLoad, request?.searchSessionId]
  );

  const [lensProps, setLensProps] = useState(buildLensProps());
  const updateLensProps = useStableCallback(() => setLensProps(buildLensProps()));

  useEffect(() => {
    const subscription = refetch$.subscribe(updateLensProps);
    return () => subscription.unsubscribe();
  }, [refetch$, updateLensProps]);

  return lensProps;
};

export const getLensProps = ({
  searchSessionId,
  getTimeRange,
  attributes,
  onLoad,
}: {
  searchSessionId?: string;
  getTimeRange: () => TimeRange;
  attributes: TypedLensByValueInput['attributes'];
  onLoad: (isLoading: boolean, adapters: Partial<DefaultInspectorAdapters> | undefined) => void;
}) => ({
  id: 'unifiedHistogramLensComponent',
  viewMode: ViewMode.VIEW,
  timeRange: getTimeRange(),
  attributes,
  noPadding: true,
  searchSessionId,
  executionContext: {
    description: 'fetch chart data and total hits',
  },
  onLoad,
});
