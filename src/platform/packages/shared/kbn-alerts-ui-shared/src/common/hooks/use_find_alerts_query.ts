/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { useQuery } from '@tanstack/react-query';
import type { HttpStart } from '@kbn/core-http-browser';
import type { ToastsStart } from '@kbn/core-notifications-browser';
import { ISearchRequestParams } from '@kbn/search-types';
import { SearchResponseBody } from '@elastic/elasticsearch/lib/api/types';
import { BASE_RAC_ALERTS_API_PATH } from '../constants';

export interface UseFindAlertsQueryProps {
  http: HttpStart;
  toasts: ToastsStart;
  enabled?: boolean;
  params: ISearchRequestParams & { ruleTypeIds?: string[]; consumers?: string[] };
}

/**
 * A generic hook to find alerts
 *
 * Still applies alerts authorization rules but, unlike triggers_actions_ui's `useFetchAlerts` hook,
 * allows to perform arbitrary queries
 */
export const useFindAlertsQuery = <T>({
  http,
  toasts,
  enabled = true,
  params,
}: UseFindAlertsQueryProps) => {
  const { ruleTypeIds, ...rest } = params;
  const onErrorFn = (error: Error) => {
    if (error) {
      toasts.addDanger(
        i18n.translate('alertsUIShared.hooks.useFindAlertsQuery.unableToFindAlertsQueryMessage', {
          defaultMessage: 'Unable to find alerts',
        })
      );
    }
  };

  return useQuery({
    queryKey: ['findAlerts', JSON.stringify(params)],
    queryFn: () =>
      http.post<SearchResponseBody<{}, T>>(`${BASE_RAC_ALERTS_API_PATH}/find`, {
        body: JSON.stringify({ ...rest, rule_type_ids: ruleTypeIds }),
      }),
    onError: onErrorFn,
    refetchOnWindowFocus: false,
    enabled,
  });
};
