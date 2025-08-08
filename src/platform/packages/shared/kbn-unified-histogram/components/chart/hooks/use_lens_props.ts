/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { TimeRange } from '@kbn/data-plugin/common';
import type { DefaultInspectorAdapters } from '@kbn/expressions-plugin/common';
import type { EmbeddableComponentProps, TypedLensByValueInput } from '@kbn/lens-plugin/public';
import { useCallback, useEffect, useState } from 'react';
import type { Observable } from 'rxjs';
import type {
  UnifiedHistogramInputMessage,
  UnifiedHistogramRequestContext,
  UnifiedHistogramVisContext,
} from '../../../types';
import { useStableCallback } from '../../../hooks/use_stable_callback';

export type LensProps = Pick<
  EmbeddableComponentProps,
  | 'id'
  | 'viewMode'
  | 'timeRange'
  | 'attributes'
  | 'noPadding'
  | 'searchSessionId'
  | 'executionContext'
  | 'onLoad'
>;

export const useLensProps = ({
  request,
  getTimeRange,
  fetch$,
  visContext,
  onLoad,
}: {
  request?: UnifiedHistogramRequestContext;
  getTimeRange: () => TimeRange;
  fetch$: Observable<UnifiedHistogramInputMessage>;
  visContext?: UnifiedHistogramVisContext;
  onLoad: (isLoading: boolean, adapters: Partial<DefaultInspectorAdapters> | undefined) => void;
}) => {
  const buildLensProps = useCallback(() => {
    if (!visContext) {
      return;
    }

    const { attributes, requestData } = visContext;

    return {
      requestData: JSON.stringify(requestData),
      lensProps: getLensProps({
        searchSessionId: request?.searchSessionId,
        getTimeRange,
        attributes,
        onLoad,
      }),
    };
  }, [visContext, getTimeRange, onLoad, request?.searchSessionId]);

  // Initialize with undefined to avoid rendering Lens until a fetch has been triggered
  const [lensPropsContext, setLensPropsContext] = useState<ReturnType<typeof buildLensProps>>();
  const updateLensPropsContext = useStableCallback(() => setLensPropsContext(buildLensProps()));

  useEffect(() => {
    const subscription = fetch$.subscribe(updateLensPropsContext);
    return () => subscription.unsubscribe();
  }, [fetch$, updateLensPropsContext]);

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
}): LensProps => ({
  id: 'unifiedHistogramLensComponent',
  viewMode: 'view',
  timeRange: getTimeRange(),
  attributes,
  noPadding: true,
  searchSessionId,
  executionContext: {
    description: 'fetch chart data and total hits',
  },
  onLoad,
});
