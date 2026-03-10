/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { cloneDeep, pick } from 'lodash';
import { ReplaySubject } from 'rxjs';
import type { UnifiedHistogramApi, UseUnifiedHistogramProps } from './use_unified_histogram';
import { createStateService } from '../services/state_service';
import { useStateProps } from './use_state_props';
import type {
  UnifiedHistogramExternalVisContextStatus,
  UnifiedHistogramFetchParams,
  UnifiedHistogramFetch$Arguments,
  UnifiedHistogramVisContext,
  LensVisServiceState,
} from '../types';
import { getBreakdownField } from '../utils/local_storage_utils';
import { processFetchParams } from '../utils/process_fetch_params';
import { LensVisService } from '../services/lens_vis_service';
import { exportVisContext } from '../utils/external_vis_context';

interface State {
  fetchParams: UnifiedHistogramFetchParams | undefined;
  lensVisService: LensVisService | undefined;
  lensVisServiceState: LensVisServiceState | undefined;
}

const INITIAL_STATE: State = {
  fetchParams: undefined,
  lensVisService: undefined,
  lensVisServiceState: undefined,
};

export const useServicesBootstrap = (
  props: UseUnifiedHistogramProps,
  options?: {
    enableLensVisService?: boolean;
  }
) => {
  const [fetch$] = useState(() => new ReplaySubject<UnifiedHistogramFetch$Arguments>(1));
  const [state, setState] = useState<State>(INITIAL_STATE);
  const { fetchParams, lensVisService, lensVisServiceState } = state;
  const { services, initialState, localStorageKeyPrefix } = props;
  const enableLensVisService = options?.enableLensVisService;
  const propsRef = useRef<UseUnifiedHistogramProps>(props);
  propsRef.current = props;

  const initialBreakdownField = useMemo(
    () =>
      localStorageKeyPrefix
        ? getBreakdownField(services.storage, localStorageKeyPrefix)
        : undefined,
    [localStorageKeyPrefix, services.storage]
  );

  useEffect(() => {
    if (state.fetchParams) {
      // update the observable after fetchParams state is set
      fetch$.next({
        fetchParams: state.fetchParams,
        lensVisServiceState: state.lensVisServiceState,
      });
    }
  }, [state, fetch$]);

  const [stateService] = useState(() => {
    return createStateService({
      services: props.services,
      initialState,
      localStorageKeyPrefix,
    });
  });

  const onVisContextChanged = useCallback(
    (
      visContext: UnifiedHistogramVisContext | undefined,
      externalVisContextStatus: UnifiedHistogramExternalVisContextStatus
    ) => {
      if (!propsRef.current.onVisContextChanged) {
        return;
      }

      const minifiedVisContext = exportVisContext(visContext);

      propsRef.current.onVisContextChanged?.(minifiedVisContext, externalVisContextStatus);
    },
    []
  );

  const [api] = useState<UnifiedHistogramApi>(() => ({
    fetch: async (params) => {
      const nextFetchParams = processFetchParams({
        params,
        services,
        initialBreakdownField,
      });
      let updatedLensVisService = lensVisService;
      if (!updatedLensVisService && enableLensVisService) {
        const apiHelper = await services.lens.stateHelperApi();
        updatedLensVisService = new LensVisService({
          services,
          lensSuggestionsApi: apiHelper.suggestions,
        });
      }
      let updatedLensVisServiceState: LensVisServiceState | undefined;
      if (updatedLensVisService && enableLensVisService) {
        updatedLensVisServiceState = updatedLensVisService.update({
          externalVisContext: nextFetchParams.externalVisContext,
          queryParams: {
            dataView: nextFetchParams.dataView,
            query: nextFetchParams.query,
            filters: nextFetchParams.filters,
            timeRange: nextFetchParams.timeRange,
            isPlainRecord: nextFetchParams.isESQLQuery,
            columns: nextFetchParams.columns,
            columnsMap: nextFetchParams.columnsMap,
          },
          timeInterval:
            !nextFetchParams.isTimeBased && !nextFetchParams.isESQLQuery
              ? undefined
              : nextFetchParams.timeInterval,
          breakdownField: nextFetchParams.breakdown?.field,
          table: nextFetchParams.table,
          onVisContextChanged: nextFetchParams.isESQLQuery ? onVisContextChanged : undefined,
          getModifiedVisAttributes: nextFetchParams.getModifiedVisAttributes
            ? (attributes) => {
                return (
                  nextFetchParams.getModifiedVisAttributes!(cloneDeep(attributes)) ?? attributes
                );
              }
            : undefined,
        });
      }
      setState({
        fetchParams: nextFetchParams,
        lensVisService: updatedLensVisService,
        lensVisServiceState: updatedLensVisServiceState,
      });
    },
    ...pick(stateService, 'state$', 'setChartHidden', 'setTopPanelHeight', 'setTotalHits'),
  }));

  const stateProps = useStateProps({
    services,
    localStorageKeyPrefix,
    stateService,
    fetchParams,
    onBreakdownFieldChange: props.onBreakdownFieldChange,
    onTimeIntervalChange: props.onTimeIntervalChange,
  });

  return {
    api,
    stateProps,
    fetch$,
    fetchParams,
    hasValidFetchParams: Boolean(fetchParams && fetchParams.searchSessionId),
    lensVisService,
    lensVisServiceState,
  };
};
