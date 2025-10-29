/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useMemo, useState } from 'react';
import { pick } from 'lodash';
import { Subject } from 'rxjs';
import type { UnifiedHistogramApi, UseUnifiedHistogramProps } from './use_unified_histogram';
import { createStateService } from '../services/state_service';
import { useStateProps } from './use_state_props';
import type { UnifiedHistogramInputMessage, UnifiedHistogramFetchParams } from '../types';
import { useRequestParams } from './use_request_params';
import { getBreakdownField } from '../utils/local_storage_utils';

export const useServicesBootstrap = (props: UseUnifiedHistogramProps) => {
  const [input$] = useState(() => new Subject<UnifiedHistogramInputMessage>());
  const [fetchParams, setFetchParams] = useState<UnifiedHistogramFetchParams | null>(null);

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
      console.log('UnifiedHistogramApi.fetch called with params:', params);
      setFetchParams(params);
      input$.next({ type: 'fetch' });
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

  const requestParams = useRequestParams({
    services,
    fetchParams,
  });

  return {
    api,
    input$,
    stateProps,
    requestParams,
    fetchParams,
    hasValidFetchParams: Boolean(
      fetchParams && (fetchParams.searchSessionId || stateProps.isPlainRecord)
    ),
  };
};
