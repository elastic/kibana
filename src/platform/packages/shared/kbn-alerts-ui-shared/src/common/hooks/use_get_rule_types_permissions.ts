/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useMemo } from 'react';
import { keyBy } from 'lodash';
import type { QueryClient } from '@kbn/react-query';
import type { HttpStart } from '@kbn/core-http-browser';
import type { RuleType } from '@kbn/triggers-actions-ui-types';
import type {
  RuleTypeIndexWithDescriptions,
  RuleTypeWithDescription,
} from '@kbn/triggers-actions-ui-types';
import { useGetRuleTypesQuery } from '@kbn/response-ops-rules-apis/hooks/use_get_rule_types_query';
import { i18n } from '@kbn/i18n';
import type { ResponseOpsQueryMeta } from '@kbn/response-ops-react-query/types';
import { ALERTS_FEATURE_ID } from '../constants';

export interface UseGetRuleTypesPermissionsParams {
  http: HttpStart;
  filteredRuleTypes?: string[];
  registeredRuleTypes?: Array<{ id: string; description: string }>;
  enabled?: boolean;
  queryClient?: QueryClient;
}

const getFilteredIndex = ({
  data,
  filteredRuleTypes,
  registeredRuleTypes,
}: {
  data: Array<RuleType<string, string>>;
  filteredRuleTypes?: string[];
  registeredRuleTypes: UseGetRuleTypesPermissionsParams['registeredRuleTypes'];
}) => {
  const index: RuleTypeIndexWithDescriptions = new Map();
  const registeredRuleTypesDictionary = registeredRuleTypes ? keyBy(registeredRuleTypes, 'id') : {};
  for (const ruleType of data) {
    const ruleTypeRecord: RuleType<string, string> & { description?: string } = { ...ruleType };
    if (!registeredRuleTypes) {
      // If rule type registry is not provided, don't use it for filtering
      index.set(ruleType.id, ruleTypeRecord);
    } else if (registeredRuleTypesDictionary[ruleType.id]) {
      // Filter out unregistered rule types, and add descriptions to registered rule types
      ruleTypeRecord.description = registeredRuleTypesDictionary[ruleType.id].description;
      index.set(ruleType.id, ruleTypeRecord);
    }
  }
  let filteredIndex = index;
  if (filteredRuleTypes?.length) {
    filteredIndex = new Map(
      [...index].filter(([k, v]) => {
        return filteredRuleTypes.includes(v.id);
      })
    );
  }
  return filteredIndex;
};

export const useGetRuleTypesPermissions = ({
  http,
  filteredRuleTypes,
  registeredRuleTypes,
  queryClient,
  enabled = true,
}: UseGetRuleTypesPermissionsParams) => {
  const { data, isSuccess, isFetching, isInitialLoading, isLoading, error } = useGetRuleTypesQuery(
    { http },
    {
      enabled,
      queryClient,
      meta: {
        getErrorToast: () => ({
          type: 'danger',
          title: i18n.translate(
            'alertsUIShared.hooks.useLoadRuleTypesQuery.unableToLoadRuleTypesMessage',
            {
              defaultMessage: 'Unable to load rule types',
            }
          ),
        }),
      } satisfies ResponseOpsQueryMeta,
    }
  );

  const filteredIndex = useMemo(
    () =>
      data
        ? getFilteredIndex({ data, filteredRuleTypes, registeredRuleTypes })
        : new Map<string, RuleTypeWithDescription>(),
    [data, filteredRuleTypes, registeredRuleTypes]
  );

  const hasAnyAuthorizedRuleType = filteredIndex.size > 0;
  const authorizedRuleTypes = useMemo(() => [...filteredIndex.values()], [filteredIndex]);
  const authorizedToCreateAnyRules = authorizedRuleTypes.some(
    (ruleType) => ruleType.authorizedConsumers[ALERTS_FEATURE_ID]?.all
  );
  const authorizedToReadAnyRules =
    authorizedToCreateAnyRules ||
    authorizedRuleTypes.some((ruleType) => ruleType.authorizedConsumers[ALERTS_FEATURE_ID]?.read);

  return {
    ruleTypesState: {
      isInitialLoad: isInitialLoading,
      isLoading: isLoading || isFetching,
      data: filteredIndex,
      error,
    },
    hasAnyAuthorizedRuleType,
    authorizedRuleTypes,
    authorizedToReadAnyRules,
    authorizedToCreateAnyRules,
    isSuccess,
  };
};
