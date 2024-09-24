/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { HttpStart } from '@kbn/core-http-browser';
import type { ToastsStart } from '@kbn/core-notifications-browser';
import { RuleCreationValidConsumer } from '@kbn/rule-data-utils';
import { useMemo } from 'react';
import {
  useHealthCheck,
  useLoadRuleTypesQuery,
  useLoadUiConfig,
  useResolveRule,
} from '../../common/hooks';
import { getAvailableRuleTypes } from '../utils';
import { RuleTypeRegistryContract } from '../../common';

export interface UseLoadDependencies {
  http: HttpStart;
  toasts: ToastsStart;
  ruleTypeRegistry: RuleTypeRegistryContract;
  consumer?: string;
  id?: string;
  ruleTypeId?: string;
  validConsumers?: RuleCreationValidConsumer[];
  filteredRuleTypes?: string[];
}

export const useLoadDependencies = (props: UseLoadDependencies) => {
  const {
    http,
    toasts,
    ruleTypeRegistry,
    consumer,
    validConsumers,
    id,
    ruleTypeId,
    filteredRuleTypes = [],
  } = props;

  const {
    data: uiConfig,
    isLoading: isLoadingUiConfig,
    isInitialLoading: isInitialLoadingUiConfig,
  } = useLoadUiConfig({ http });

  const {
    error: healthCheckError,
    isLoading: isLoadingHealthCheck,
    isInitialLoading: isInitialLoadingHealthCheck,
  } = useHealthCheck({ http });

  const {
    data: fetchedFormData,
    isLoading: isLoadingRule,
    isInitialLoading: isInitialLoadingRule,
  } = useResolveRule({ http, id });

  const {
    ruleTypesState: {
      data: ruleTypeIndex,
      isLoading: isLoadingRuleTypes,
      isInitialLoad: isInitialLoadingRuleTypes,
    },
  } = useLoadRuleTypesQuery({
    http,
    toasts,
    filteredRuleTypes,
  });

  const computedRuleTypeId = useMemo(() => {
    return fetchedFormData?.ruleTypeId || ruleTypeId;
  }, [fetchedFormData, ruleTypeId]);

  const authorizedRuleTypeItems = useMemo(() => {
    const computedConsumer = consumer || fetchedFormData?.consumer;
    if (!computedConsumer) {
      return [];
    }
    return getAvailableRuleTypes({
      consumer: computedConsumer,
      ruleTypes: [...ruleTypeIndex.values()],
      ruleTypeRegistry,
      validConsumers,
    });
  }, [consumer, ruleTypeIndex, ruleTypeRegistry, validConsumers, fetchedFormData]);

  const [ruleType, ruleTypeModel] = useMemo(() => {
    const item = authorizedRuleTypeItems.find(({ ruleType: rt }) => {
      return rt.id === computedRuleTypeId;
    });

    return [item?.ruleType, item?.ruleTypeModel];
  }, [authorizedRuleTypeItems, computedRuleTypeId]);

  const isLoading = useMemo(() => {
    if (id === undefined) {
      return isLoadingUiConfig || isLoadingHealthCheck || isLoadingRuleTypes;
    }
    return isLoadingUiConfig || isLoadingHealthCheck || isLoadingRule || isLoadingRuleTypes;
  }, [id, isLoadingUiConfig, isLoadingHealthCheck, isLoadingRule, isLoadingRuleTypes]);

  const isInitialLoading = useMemo(() => {
    if (id === undefined) {
      return isInitialLoadingUiConfig || isInitialLoadingHealthCheck || isInitialLoadingRuleTypes;
    }
    return (
      isInitialLoadingUiConfig ||
      isInitialLoadingHealthCheck ||
      isInitialLoadingRule ||
      isInitialLoadingRuleTypes
    );
  }, [
    id,
    isInitialLoadingUiConfig,
    isInitialLoadingHealthCheck,
    isInitialLoadingRule,
    isInitialLoadingRuleTypes,
  ]);

  return {
    isLoading,
    isInitialLoading: !!isInitialLoading,
    ruleType,
    ruleTypeModel,
    uiConfig,
    healthCheckError,
    fetchedFormData,
  };
};
