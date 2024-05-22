/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { HttpStart } from '@kbn/core-http-browser';
import type { ToastsStart } from '@kbn/core-notifications-browser';
import { useMemo } from 'react';
import {
  useHealthCheck,
  useLoadRuleTypesQuery,
  useLoadUiConfig,
  useResolveRule,
} from '../../common/hooks';
import { RuleTypeRegistryContract } from '../types';

export interface UseLoadDependencies {
  http: HttpStart;
  toasts: ToastsStart;
  ruleTypeRegistry: RuleTypeRegistryContract;
  id?: string;
  ruleTypeId?: string;
}

export const useLoadDependencies = (props: UseLoadDependencies) => {
  const { http, toasts, ruleTypeRegistry, id, ruleTypeId } = props;

  const { data: uiConfig, isLoading: isLoadingUiConfig } = useLoadUiConfig({ http });

  const { error: healthCheckError, isLoading: isLoadingHealthCheck } = useHealthCheck({ http });

  const { data: fetchedFormData, isLoading: isLoadingRule } = useResolveRule({ http, id });

  const {
    ruleTypesState: { data: ruleTypeIndex, isLoading: isLoadingRuleTypes },
  } = useLoadRuleTypesQuery({
    http,
    toasts,
  });

  const computedRuleTypeId = useMemo(() => {
    return fetchedFormData?.ruleTypeId || ruleTypeId;
  }, [fetchedFormData, ruleTypeId]);

  const ruleTypes = [...ruleTypeIndex.values()];

  const ruleType = ruleTypes.find((rt) => rt.id === computedRuleTypeId);

  const ruleTypeModel = useMemo(() => {
    let model;
    try {
      model = ruleTypeRegistry.get(computedRuleTypeId!);
    } catch (e) {
      return null;
    }
    return model;
  }, [ruleTypeRegistry, computedRuleTypeId]);

  const isLoading = useMemo(() => {
    if (typeof id === 'undefined') {
      return isLoadingUiConfig || isLoadingHealthCheck || isLoadingRuleTypes;
    }
    return isLoadingUiConfig || isLoadingHealthCheck || isLoadingRule || isLoadingRuleTypes;
  }, [id, isLoadingUiConfig, isLoadingHealthCheck, isLoadingRule, isLoadingRuleTypes]);

  return {
    isLoading,
    ruleType,
    ruleTypeModel,
    uiConfig,
    healthCheckError,
    fetchedFormData,
  };
};
