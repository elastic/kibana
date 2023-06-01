/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { TimeRange } from '@kbn/data-common';
import { ViewMode } from '@kbn/embeddable-plugin/public';
import type { DefaultInspectorAdapters } from '@kbn/expressions-plugin/common';
import type { TypedLensByValueInput } from '@kbn/lens-plugin/public';
import { useCallback, useEffect, useState } from 'react';
import type { Observable } from 'rxjs';
import type { UnifiedHistogramInputMessage, UnifiedHistogramRequestContext } from '../../types';
import type { LensAttributesContext } from '../utils/get_lens_attributes';
import { useStableCallback } from './use_stable_callback';

export const useLensProps = ({
  request,
  getTimeRange,
  refetch$,
  attributesContext,
  onLoad,
}: {
  request?: UnifiedHistogramRequestContext;
  getTimeRange: () => TimeRange;
  refetch$: Observable<UnifiedHistogramInputMessage>;
  attributesContext: LensAttributesContext;
  onLoad: (isLoading: boolean, adapters: Partial<DefaultInspectorAdapters> | undefined) => void;
}) => {
  const buildLensProps = useCallback(() => {
    const { attributes, requestData } = attributesContext;
    return {
      requestData: JSON.stringify(requestData),
      lensProps: getLensProps({
        searchSessionId: request?.searchSessionId,
        getTimeRange,
        attributes,
        onLoad,
      }),
    };
  }, [attributesContext, getTimeRange, onLoad, request?.searchSessionId]);

  const [lensPropsContext, setLensPropsContext] = useState(buildLensProps());
  const updateLensPropsContext = useStableCallback(() => setLensPropsContext(buildLensProps()));

  useEffect(() => {
    const subscription = refetch$.subscribe(updateLensPropsContext);
    return () => subscription.unsubscribe();
  }, [refetch$, updateLensPropsContext]);

  return lensPropsContext;
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
