/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect, useMemo, useState } from 'react';
import { pick } from 'lodash';
import { ReplaySubject } from 'rxjs';
import type { UnifiedHistogramApi, UseUnifiedHistogramProps } from './use_unified_histogram';
import { createStateService } from '../services/state_service';
import { useStateProps } from './use_state_props';
import type { UnifiedHistogramFetchParams } from '../types';
import { getBreakdownField } from '../utils/local_storage_utils';
import { processFetchParams } from '../utils/process_fetch_params';

export const useServicesBootstrap = (props: UseUnifiedHistogramProps) => {
  const [fetch$] = useState(() => new ReplaySubject<UnifiedHistogramFetchParams | undefined>(1));
  const [fetchParams, setFetchParams] = useState<UnifiedHistogramFetchParams | undefined>(
    undefined
  );

  useEffect(() => {
    if (fetchParams) {
      // update the observable after fetchParams state is set
      fetch$.next(fetchParams);
    }
  }, [fetchParams, fetch$]);

  const [stateService] = useState(() => {
    const { services, initialState, localStorageKeyPrefix } = props;
    return createStateService({
      services,
      initialState,
      localStorageKeyPrefix,
    });
  });

  const [api] = useState<UnifiedHistogramApi>(() => ({
    fetch: (params) => {
      // console.log('UnifiedHistogramApi.fetch called with params:', params);
      setFetchParams(processFetchParams({ params, services }));
    },
    ...pick(
      stateService,
      'state$',
      'setChartHidden',
      'setTopPanelHeight',
      'setTimeInterval',
      'setTotalHits'
    ),
  }));

  const { services, localStorageKeyPrefix } = props;

  const initialBreakdownField = useMemo(
    () =>
      localStorageKeyPrefix
        ? getBreakdownField(services.storage, localStorageKeyPrefix)
        : undefined,
    [localStorageKeyPrefix, services.storage]
  );

  const stateProps = useStateProps({
    services,
    localStorageKeyPrefix,
    stateService,
    fetchParams,
    initialBreakdownField,
    onBreakdownFieldChange: props.onBreakdownFieldChange,
    onVisContextChanged: props.onVisContextChanged,
  });

  return {
    api,
    stateProps,
    fetch$,
    fetchParams,
    hasValidFetchParams: Boolean(
      fetchParams && (fetchParams.searchSessionId || fetchParams.isESQLQuery)
    ),
  };
};
