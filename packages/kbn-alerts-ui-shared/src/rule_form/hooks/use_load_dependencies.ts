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
import { ApplicationStart } from '@kbn/core-application-browser';
import { RuleCreationValidConsumer } from '@kbn/rule-data-utils';
import { useMemo } from 'react';
import {
  useHealthCheck,
  useLoadConnectors,
  useLoadConnectorTypes,
  useLoadRuleTypesQuery,
  useLoadUiConfig,
  useResolveRule,
} from '../../common/hooks';
import { RuleTypeRegistryContract } from '../../common';
import { useFetchFlappingSettings } from '../../common/hooks/use_fetch_flapping_settings';
import { IS_RULE_SPECIFIC_FLAPPING_ENABLED } from '../../common/constants/rule_flapping';
import { useLoadRuleTypeAadTemplateField } from '../../common/hooks/use_load_rule_type_aad_template_fields';

export interface UseLoadDependencies {
  http: HttpStart;
  toasts: ToastsStart;
  ruleTypeRegistry: RuleTypeRegistryContract;
  capabilities: ApplicationStart['capabilities'];
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
    id,
    ruleTypeId,
    capabilities,
    filteredRuleTypes = [],
  } = props;

  const canReadConnectors = !!capabilities.actions?.show;

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
  } = useResolveRule({ http, id, cacheTime: 0 });

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

  const {
    data: flappingSettings,
    isLoading: isLoadingFlappingSettings,
    isInitialLoading: isInitialLoadingFlappingSettings,
  } = useFetchFlappingSettings({
    http,
    enabled: IS_RULE_SPECIFIC_FLAPPING_ENABLED,
  });

  const {
    data: connectors = [],
    isLoading: isLoadingConnectors,
    isInitialLoading: isInitialLoadingConnectors,
  } = useLoadConnectors({
    http,
    includeSystemActions: true,
    enabled: canReadConnectors,
    cacheTime: 0,
  });

  const computedRuleTypeId = useMemo(() => {
    return fetchedFormData?.ruleTypeId || ruleTypeId;
  }, [fetchedFormData, ruleTypeId]);

  // Fetching Action related dependencies
  const {
    data: connectorTypes = [],
    isLoading: isLoadingConnectorTypes,
    isInitialLoading: isInitialLoadingConnectorTypes,
  } = useLoadConnectorTypes({
    http,
    includeSystemActions: true,
    enabled: canReadConnectors,
  });

  const {
    data: aadTemplateFields,
    isLoading: isLoadingAadtemplateFields,
    isInitialLoading: isInitialLoadingAadTemplateField,
  } = useLoadRuleTypeAadTemplateField({
    http,
    ruleTypeId: computedRuleTypeId,
    enabled: !!computedRuleTypeId && canReadConnectors,
    cacheTime: 0,
  });

  const ruleType = useMemo(() => {
    if (!computedRuleTypeId || !ruleTypeIndex) {
      return null;
    }
    return ruleTypeIndex.get(computedRuleTypeId);
  }, [computedRuleTypeId, ruleTypeIndex]);

  const ruleTypeModel = useMemo(() => {
    if (!computedRuleTypeId) {
      return null;
    }
    return ruleTypeRegistry.get(computedRuleTypeId);
  }, [computedRuleTypeId, ruleTypeRegistry]);

  const isLoading = useMemo(() => {
    // Create Mode
    if (id === undefined) {
      return (
        isLoadingUiConfig ||
        isLoadingHealthCheck ||
        isLoadingRuleTypes ||
        isLoadingFlappingSettings ||
        isLoadingConnectors ||
        isLoadingConnectorTypes ||
        isLoadingAadtemplateFields
      );
    }

    // Edit Mode
    return (
      isLoadingUiConfig ||
      isLoadingHealthCheck ||
      isLoadingRule ||
      isLoadingRuleTypes ||
      isLoadingFlappingSettings ||
      isLoadingConnectors ||
      isLoadingConnectorTypes ||
      isLoadingAadtemplateFields
    );
  }, [
    id,
    isLoadingUiConfig,
    isLoadingHealthCheck,
    isLoadingRule,
    isLoadingRuleTypes,
    isLoadingFlappingSettings,
    isLoadingConnectors,
    isLoadingConnectorTypes,
    isLoadingAadtemplateFields,
  ]);

  const isInitialLoading = useMemo(() => {
    // Create Mode
    if (id === undefined) {
      return (
        isInitialLoadingUiConfig ||
        isInitialLoadingHealthCheck ||
        isInitialLoadingRuleTypes ||
        isInitialLoadingFlappingSettings ||
        isInitialLoadingConnectors ||
        isInitialLoadingConnectorTypes ||
        isInitialLoadingAadTemplateField
      );
    }

    // Edit Mode
    return (
      isInitialLoadingUiConfig ||
      isInitialLoadingHealthCheck ||
      isInitialLoadingRule ||
      isInitialLoadingRuleTypes ||
      isInitialLoadingFlappingSettings ||
      isInitialLoadingConnectors ||
      isInitialLoadingConnectorTypes ||
      isInitialLoadingAadTemplateField
    );
  }, [
    id,
    isInitialLoadingUiConfig,
    isInitialLoadingHealthCheck,
    isInitialLoadingRule,
    isInitialLoadingRuleTypes,
    isInitialLoadingFlappingSettings,
    isInitialLoadingConnectors,
    isInitialLoadingConnectorTypes,
    isInitialLoadingAadTemplateField,
  ]);

  return {
    isLoading,
    isInitialLoading: !!isInitialLoading,
    ruleType,
    ruleTypeModel,
    ruleTypes: [...ruleTypeIndex.values()],
    uiConfig,
    healthCheckError,
    fetchedFormData,
    flappingSettings,
    connectors,
    connectorTypes,
    aadTemplateFields,
  };
};
