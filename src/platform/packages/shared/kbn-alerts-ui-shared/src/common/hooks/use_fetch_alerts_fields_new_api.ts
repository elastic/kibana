/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useQuery } from '@tanstack/react-query';
import { i18n } from '@kbn/i18n';
import type { ToastsStart } from '@kbn/core/public';
import type { QueryOptionsOverrides } from '../types/tanstack_query_utility_types';
import type { FetchAlertsFieldsNewApiParams } from '../apis/fetch_alert_fields_new_api';
import { fetchAlertsFieldsNewApi } from '../apis/fetch_alert_fields_new_api';

export type UseFetchAlertsFieldsNewApiQueryParams = FetchAlertsFieldsNewApiParams & {
  toasts: ToastsStart;
};

// Query key prefix MUST contain explicit strings, not fetchAlertsFields.name
// Production builds cannot guarantee a unique function name
const queryKeyPrefix = ['alerts', 'fetchAlertsFieldsViaNewApi'];

/**
 * Fetch alerts indexes alert fields for the given feature ids
 *
 * When testing components that depend on this hook, prefer mocking the {@link fetchAlertsFields} function instead of the hook itself.
 * @external https://tanstack.com/query/v4/docs/framework/react/guides/testing
 */
export const useFetchAlertsFieldsNewApi = (
  { http, ...params }: UseFetchAlertsFieldsNewApiQueryParams,
  options?: Pick<
    QueryOptionsOverrides<typeof fetchAlertsFieldsNewApi>,
    'placeholderData' | 'context' | 'onError' | 'refetchOnWindowFocus' | 'staleTime' | 'enabled'
  >
) => {
  const { ruleTypeIds, toasts } = params;

  return useQuery({
    queryKey: queryKeyPrefix.concat(ruleTypeIds),
    queryFn: () => fetchAlertsFieldsNewApi({ http, ruleTypeIds }),
    placeholderData: { alertFields: {}, fields: [] },
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
    ...options,
    enabled: options?.enabled == null || options.enabled,
    onError: () => {
      toasts.addDanger(
        i18n.translate('alertsUIShared.hooks.useFetchAlertsFieldsNewApi.fetchErrorMessage', {
          defaultMessage: 'Unable to load alert fields',
        })
      );
    },
  });
};
