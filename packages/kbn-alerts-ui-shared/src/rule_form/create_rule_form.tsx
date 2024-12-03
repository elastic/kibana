/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback } from 'react';
import { EuiLoadingElastic } from '@elastic/eui';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { type RuleCreationValidConsumer } from '@kbn/rule-data-utils';
import type { RuleFormData, RuleFormPlugins } from './types';
import { DEFAULT_VALID_CONSUMERS, getDefaultFormData } from './constants';
import { RuleFormStateProvider } from './rule_form_state';
import { useCreateRule } from '../common/hooks';
import { RulePage } from './rule_page';
import {
  RuleFormCircuitBreakerError,
  RuleFormErrorPromptWrapper,
  RuleFormHealthCheckError,
  RuleFormRuleTypeError,
} from './rule_form_errors';
import { useLoadDependencies } from './hooks/use_load_dependencies';
import {
  getAvailableRuleTypes,
  getInitialConsumer,
  getInitialMultiConsumer,
  getInitialSchedule,
  parseRuleCircuitBreakerErrorMessage,
} from './utils';
import { RULE_CREATE_SUCCESS_TEXT, RULE_CREATE_ERROR_TEXT } from './translations';

export interface CreateRuleFormProps {
  ruleTypeId: string;
  plugins: RuleFormPlugins;
  consumer?: string;
  multiConsumerSelection?: RuleCreationValidConsumer | null;
  hideInterval?: boolean;
  validConsumers?: RuleCreationValidConsumer[];
  filteredRuleTypes?: string[];
  shouldUseRuleProducer?: boolean;
  canShowConsumerSelection?: boolean;
  showMustacheAutocompleteSwitch?: boolean;
  onCancel?: () => void;
  onSubmit?: (ruleId: string) => void;
  connectorFeatureId?: string;
}

export const CreateRuleForm = (props: CreateRuleFormProps) => {
  const {
    ruleTypeId,
    plugins,
    consumer = 'alerts',
    multiConsumerSelection,
    validConsumers = DEFAULT_VALID_CONSUMERS,
    filteredRuleTypes = [],
    shouldUseRuleProducer = false,
    canShowConsumerSelection = true,
    showMustacheAutocompleteSwitch = false,
    connectorFeatureId = 'alerting',
    onCancel,
    onSubmit,
  } = props;

  const { http, docLinks, notifications, ruleTypeRegistry, i18n, theme } = plugins;
  const { toasts } = notifications;

  const { mutate, isLoading: isSaving } = useCreateRule({
    http,
    onSuccess: ({ name, id }) => {
      toasts.addSuccess(RULE_CREATE_SUCCESS_TEXT(name));
      onSubmit?.(id);
    },
    onError: (error) => {
      const message = parseRuleCircuitBreakerErrorMessage(
        error.body?.message || RULE_CREATE_ERROR_TEXT
      );
      toasts.addDanger({
        title: message.summary,
        ...(message.details && {
          text: toMountPoint(
            <RuleFormCircuitBreakerError>{message.details}</RuleFormCircuitBreakerError>,
            { i18n, theme }
          ),
        }),
      });
    },
  });

  const {
    isInitialLoading,
    ruleType,
    ruleTypes,
    ruleTypeModel,
    uiConfig,
    healthCheckError,
    connectors,
    connectorTypes,
    aadTemplateFields,
    flappingSettings,
  } = useLoadDependencies({
    http,
    toasts: notifications.toasts,
    capabilities: plugins.application.capabilities,
    ruleTypeRegistry,
    ruleTypeId,
    consumer,
    validConsumers,
    filteredRuleTypes,
    connectorFeatureId,
  });

  const onSave = useCallback(
    (newFormData: RuleFormData) => {
      mutate({
        formData: {
          name: newFormData.name,
          ruleTypeId: newFormData.ruleTypeId!,
          enabled: true,
          consumer: newFormData.consumer,
          tags: newFormData.tags,
          params: newFormData.params,
          schedule: newFormData.schedule,
          actions: newFormData.actions,
          notifyWhen: newFormData.notifyWhen,
          alertDelay: newFormData.alertDelay,
          flapping: newFormData.flapping,
        },
      });
    },
    [mutate]
  );

  if (isInitialLoading) {
    return (
      <RuleFormErrorPromptWrapper hasBorder={false} hasShadow={false}>
        <EuiLoadingElastic size="xl" />
      </RuleFormErrorPromptWrapper>
    );
  }

  if (!ruleType || !ruleTypeModel) {
    return (
      <RuleFormErrorPromptWrapper hasBorder={false} hasShadow={false}>
        <RuleFormRuleTypeError />
      </RuleFormErrorPromptWrapper>
    );
  }

  if (healthCheckError) {
    return (
      <RuleFormErrorPromptWrapper>
        <RuleFormHealthCheckError error={healthCheckError} docLinks={docLinks} />
      </RuleFormErrorPromptWrapper>
    );
  }

  return (
    <div data-test-subj="createRuleForm">
      <RuleFormStateProvider
        initialRuleFormState={{
          formData: getDefaultFormData({
            ruleTypeId,
            name: `${ruleType.name} rule`,
            consumer: getInitialConsumer({
              consumer,
              ruleType,
              shouldUseRuleProducer,
            }),
            schedule: getInitialSchedule({
              ruleType,
              minimumScheduleInterval: uiConfig?.minimumScheduleInterval,
            }),
            actions: [],
          }),
          plugins,
          connectors,
          connectorTypes,
          aadTemplateFields,
          minimumScheduleInterval: uiConfig?.minimumScheduleInterval,
          selectedRuleTypeModel: ruleTypeModel,
          selectedRuleType: ruleType,
          availableRuleTypes: getAvailableRuleTypes({
            consumer,
            ruleTypes,
            ruleTypeRegistry,
          }).map(({ ruleType: rt }) => rt),
          validConsumers,
          flappingSettings,
          canShowConsumerSelection,
          showMustacheAutocompleteSwitch,
          multiConsumerSelection: getInitialMultiConsumer({
            multiConsumerSelection,
            validConsumers,
            ruleType,
          }),
        }}
      >
        <RulePage isEdit={false} isSaving={isSaving} onCancel={onCancel} onSave={onSave} />
      </RuleFormStateProvider>
    </div>
  );
};
