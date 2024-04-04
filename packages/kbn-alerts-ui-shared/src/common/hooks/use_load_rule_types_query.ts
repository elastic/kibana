/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { keyBy } from 'lodash';
import { i18n } from '@kbn/i18n';
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { HttpStart } from '@kbn/core-http-browser';
import type { ToastsStart } from '@kbn/core-notifications-browser';
import type { RuleType } from '@kbn/triggers-actions-ui-types';
import { ALERTS_FEATURE_ID } from '../constants';
import { fetchRuleTypes } from '../apis/fetch_rule_types';
import { RuleTypeIndexWithDescriptions, RuleTypeWithDescription } from '../types';

export interface UseRuleTypesProps {
  http: HttpStart;
  toasts: ToastsStart;
  filteredRuleTypes: string[];
  registeredRuleTypes?: Array<{ id: string; description: string }>;
  enabled?: boolean;
}

const getFilteredIndex = (
  data: Array<RuleType<string, string>>,
  filteredRuleTypes: string[],
  registeredRuleTypes: UseRuleTypesProps['registeredRuleTypes']
) => {
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

export const useLoadRuleTypesQuery = ({
  http,
  toasts,
  filteredRuleTypes,
  registeredRuleTypes,
  enabled = true,
}: UseRuleTypesProps) => {
  const queryFn = () => {
    return fetchRuleTypes({ http });
  };

  const onErrorFn = (error: Error) => {
    if (error) {
      toasts.addDanger(
        i18n.translate('alertsUIShared.hooks.useLoadRuleTypesQuery.unableToLoadRuleTypesMessage', {
          defaultMessage: 'Unable to load rule types',
        })
      );
    }
  };
  const { data, isSuccess, isFetching, isInitialLoading, isLoading, error } = useQuery({
    queryKey: ['loadRuleTypes'],
    queryFn,
    onError: onErrorFn,
    refetchOnWindowFocus: false,
    // Leveraging TanStack Query's caching system to avoid duplicated requests as
    // other state-sharing solutions turned out to be overly complex and less readable
    staleTime: 60 * 1000,
    enabled,
  });

  const filteredIndex = useMemo(
    () =>
      data
        ? getFilteredIndex(data, filteredRuleTypes, registeredRuleTypes)
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
      initialLoad: isLoading || isInitialLoading,
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
