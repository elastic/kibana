/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { AlertConsumers, isValidFeatureId } from '@kbn/rule-data-utils';
import { useQuery } from '@tanstack/react-query';
import type { QueryOptionsOverrides } from '../types/tanstack_query_utility_types';
import { fetchAlertsFields, FetchAlertsFieldsParams } from '../apis/fetch_alerts_fields';

export type UseFetchAlertsFieldsQueryParams = FetchAlertsFieldsParams;

const UNSUPPORTED_FEATURE_ID = AlertConsumers.SIEM;

export const queryKeyPrefix = ['alerts', fetchAlertsFields.name];

/**
 * Fetch alerts indexes browser fields for the given feature ids
 *
 * When testing components that depend on this hook, prefer mocking the {@link fetchAlertsFields} function instead of the hook itself.
 * @external https://tanstack.com/query/v4/docs/framework/react/guides/testing
 */
export const useFetchAlertsFieldsQuery = (
  { http, ...params }: UseFetchAlertsFieldsQueryParams,
  options?: Pick<
    QueryOptionsOverrides<typeof fetchAlertsFields>,
    'context' | 'onError' | 'refetchOnWindowFocus' | 'staleTime' | 'enabled'
  >
) => {
  const { featureIds } = params;

  const validFeatureIds = featureIds.filter(
    (fid) => isValidFeatureId(fid) && fid !== UNSUPPORTED_FEATURE_ID
  );

  return useQuery({
    queryKey: queryKeyPrefix.concat(JSON.stringify(featureIds)),
    queryFn: () => fetchAlertsFields({ http, featureIds: validFeatureIds }),
    enabled: validFeatureIds.length > 0,
    initialData: { browserFields: {}, fields: [] },
    ...options,
  });
};
