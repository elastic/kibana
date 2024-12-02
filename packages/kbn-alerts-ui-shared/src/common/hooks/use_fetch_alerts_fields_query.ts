/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { AlertConsumers, isValidFeatureId } from '@kbn/rule-data-utils';
import { useQuery } from '@tanstack/react-query';
import type { QueryOptionsOverrides } from '../types/tanstack_query_utility_types';
import { fetchAlertsFields, FetchAlertsFieldsParams } from '../apis/fetch_alerts_fields';

export type UseFetchAlertsFieldsQueryParams = FetchAlertsFieldsParams;

const UNSUPPORTED_FEATURE_ID = AlertConsumers.SIEM;

// Query key prefix MUST contain explicit strings, not fetchAlertsFields.name
// Production builds cannot guarantee a unique function name
export const queryKeyPrefix = ['alerts', 'fetchAlertsFields'];

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
    'placeholderData' | 'context' | 'onError' | 'refetchOnWindowFocus' | 'staleTime' | 'enabled'
  >
) => {
  const { featureIds } = params;

  const validFeatureIds = featureIds.filter(
    (fid) => isValidFeatureId(fid) && fid !== UNSUPPORTED_FEATURE_ID
  );

  return useQuery({
    queryKey: queryKeyPrefix.concat(featureIds),
    queryFn: () => fetchAlertsFields({ http, featureIds: validFeatureIds }),
    placeholderData: { browserFields: {}, fields: [] },
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
    ...options,
    enabled: validFeatureIds.length > 0 && (options?.enabled == null || options.enabled),
  });
};
