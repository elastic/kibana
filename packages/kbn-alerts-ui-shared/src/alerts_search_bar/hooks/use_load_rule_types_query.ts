/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { useQuery } from '@tanstack/react-query';
import type { RuleType, RuleTypeIndex } from '@kbn/triggers-actions-ui-types';
import type { ToastsStart, HttpStart } from '@kbn/core/public';
import { ALERTS_FEATURE_ID } from '../constants';
import { fetchRuleTypes } from '../apis/fetch_rule_types';

export interface UseLoadRuleTypesQueryProps {
  filteredRuleTypes: string[];
  enabled?: boolean;
  http: HttpStart;
  toasts: ToastsStart;
}

const getFilteredIndex = (data: Array<RuleType<string, string>>, filteredRuleTypes: string[]) => {
  const index: RuleTypeIndex = new Map();
  for (const ruleType of data) {
    index.set(ruleType.id, ruleType);
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

export const useLoadRuleTypesQuery = (props: UseLoadRuleTypesQueryProps) => {
  const { filteredRuleTypes, enabled = true, http, toasts } = props;

  const queryFn = () => {
    return fetchRuleTypes({ http });
  };

  const onErrorFn = () => {
    toasts.addDanger(
      i18n.translate('alertsUIShared.hooks.useLoadRuleTypesQuery.unableToLoadRuleTypesMessage', {
        defaultMessage: 'Unable to load rule types',
      })
    );
  };

  const { data, isSuccess, isFetching, isInitialLoading, isLoading } = useQuery({
    queryKey: ['loadRuleTypes'],
    queryFn,
    onError: onErrorFn,
    refetchOnWindowFocus: false,
    enabled,
  });

  const filteredIndex = data ? getFilteredIndex(data, filteredRuleTypes) : new Map();

  const hasAnyAuthorizedRuleType = filteredIndex.size > 0;
  const authorizedRuleTypes = [...filteredIndex.values()];
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
    },
    hasAnyAuthorizedRuleType,
    authorizedRuleTypes,
    authorizedToReadAnyRules,
    authorizedToCreateAnyRules,
    isSuccess,
  };
};
