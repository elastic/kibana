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
import { getAvailableRuleTypes } from '../utils';
import { RuleTypeRegistryContract } from '../../common';
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
    consumer,
    validConsumers,
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

  const {
    data: connectors = [],
    isLoading: isLoadingConnectors,
    isInitialLoading: isInitialLoadingConnectors,
  } = useLoadConnectors({
    http,
    includeSystemActions: true,
    enabled: canReadConnectors,
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
  });

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
    // Create Mode
    if (id === undefined) {
      return (
        isLoadingUiConfig ||
        isLoadingHealthCheck ||
        isLoadingRuleTypes ||
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
    isInitialLoadingConnectors,
    isInitialLoadingConnectorTypes,
    isInitialLoadingAadTemplateField,
  ]);

  return {
    isLoading,
    isInitialLoading: !!isInitialLoading,
    ruleType,
    ruleTypeModel,
    uiConfig,
    healthCheckError,
    fetchedFormData,
    connectors,
    connectorTypes,
    aadTemplateFields,
  };
};
