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
import type { ESQLControlVariable } from '@kbn/esql-types';
import type { UnifiedHistogramFetch$, UnifiedHistogramFetchParams } from '../../../types';
import { useStableCallback } from '../../../hooks/use_stable_callback';
import type { LensVisService } from '../../../services/lens_vis_service';

export type LensProps = Pick<
  EmbeddableComponentProps,
  | 'id'
  | 'viewMode'
  | 'timeRange'
  | 'attributes'
  | 'esqlVariables'
  | 'noPadding'
  | 'searchSessionId'
  | 'executionContext'
  | 'onLoad'
>;

export const useLensProps = ({
  fetch$,
  fetchParams,
  lensVisService,
  onLoad,
}: {
  fetch$: UnifiedHistogramFetch$;
  fetchParams: UnifiedHistogramFetchParams;
  lensVisService: LensVisService;
  onLoad: (isLoading: boolean, adapters: Partial<DefaultInspectorAdapters> | undefined) => void;
}) => {
  const buildLensProps = useCallback(() => {
    const visContext = lensVisService.getStateValue().visContext;
    // console.log('useLensProps - buildLensProps called', visContext);
    if (!visContext) {
      return;
    }

    const { attributes, requestData } = visContext;

    return {
      requestData: JSON.stringify(requestData),
      lensProps: getLensProps({
        searchSessionId: fetchParams.searchSessionId,
        timeRange: fetchParams.timeRange,
        esqlVariables: fetchParams.esqlVariables,
        attributes,
        onLoad,
      }),
    };
  }, [
    lensVisService,
    fetchParams.searchSessionId,
    fetchParams.timeRange,
    fetchParams.esqlVariables,
    onLoad,
  ]);

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
  timeRange,
  attributes,
  esqlVariables,
  onLoad,
}: {
  searchSessionId: string | undefined;
  timeRange: TimeRange;
  attributes: TypedLensByValueInput['attributes'];
  esqlVariables: ESQLControlVariable[] | undefined;
  onLoad: (isLoading: boolean, adapters: Partial<DefaultInspectorAdapters> | undefined) => void;
}): LensProps => ({
  id: 'unifiedHistogramLensComponent',
  viewMode: 'view',
  timeRange,
  attributes,
  esqlVariables,
  noPadding: true,
  searchSessionId,
  executionContext: {
    description: 'fetch chart data and total hits',
  },
  onLoad,
});
