/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useMemo } from 'react';
import { EuiLoadingElastic } from '@elastic/eui';
import { toMountPoint } from '@kbn/react-kibana-mount';
import type { RuleFormData, RuleFormPlugins, RuleTypeMetaData } from './types';
import { RuleFormStateProvider } from './rule_form_state';
import { useUpdateRule } from './common/hooks';
import { RulePage } from './rule_page';
import { RuleFlyout } from './rule_flyout';
import { RuleFormHealthCheckError } from './rule_form_errors/rule_form_health_check_error';
import { useLoadDependencies } from './hooks/use_load_dependencies';
import {
  RuleFormActionPermissionError,
  RuleFormCircuitBreakerError,
  RuleFormErrorPromptWrapper,
  RuleFormResolveRuleError,
  RuleFormRuleTypeError,
} from './rule_form_errors';
import { RULE_EDIT_ERROR_TEXT, RULE_EDIT_SUCCESS_TEXT } from './translations';
import { getAvailableRuleTypes, parseRuleCircuitBreakerErrorMessage } from './utils';
import type { RuleFormStepId } from './constants';
import { DEFAULT_VALID_CONSUMERS, getDefaultFormData } from './constants';

export interface EditRuleFormProps {
  id: string;
  plugins: RuleFormPlugins;
  showMustacheAutocompleteSwitch?: boolean;
  connectorFeatureId?: string;
  isFlyout?: boolean;
  onCancel?: () => void;
  onSubmit?: (ruleId: string) => void;
  onChangeMetaData?: (metadata?: RuleTypeMetaData) => void;
  initialMetadata?: RuleTypeMetaData;
  initialEditStep?: RuleFormStepId;
}

export const EditRuleForm = (props: EditRuleFormProps) => {
  const {
    id,
    plugins,
    showMustacheAutocompleteSwitch = false,
    connectorFeatureId = 'alerting',
    onCancel,
    onSubmit,
    isFlyout,
    onChangeMetaData,
    initialMetadata,
    initialEditStep,
  } = props;
  const { http, notifications, docLinks, ruleTypeRegistry, application, fieldsMetadata, ...deps } =
    plugins;
  const { toasts } = notifications;

  const { mutate, isLoading: isSaving } = useUpdateRule({
    http,
    onSuccess: ({ name }) => {
      toasts.addSuccess(RULE_EDIT_SUCCESS_TEXT(name));
      onSubmit?.(id);
    },
    onError: (error) => {
      const message = parseRuleCircuitBreakerErrorMessage(
        error.body?.message || RULE_EDIT_ERROR_TEXT
      );
      toasts.addDanger({
        title: message.summary,
        ...(message.details && {
          text: toMountPoint(
            <RuleFormCircuitBreakerError>{message.details}</RuleFormCircuitBreakerError>,
            deps
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
    fetchedFormData,
    connectors,
    connectorTypes,
    alertFields,
    flappingSettings,
  } = useLoadDependencies({
    http,
    toasts: notifications.toasts,
    capabilities: plugins.application.capabilities,
    ruleTypeRegistry,
    id,
    connectorFeatureId,
    fieldsMetadata,
  });

  const onSave = useCallback(
    (newFormData: RuleFormData) => {
      mutate({
        id,
        formData: {
          name: newFormData.name,
          tags: newFormData.tags,
          schedule: newFormData.schedule,
          params: newFormData.params,
          actions: newFormData.actions,
          alertDelay: newFormData.alertDelay,
          flapping: newFormData.flapping,
          artifacts: newFormData.artifacts,
        },
      });
    },
    [id, mutate]
  );

  const canEditRule = useMemo(() => {
    if (!ruleType || !fetchedFormData) {
      return false;
    }

    const { consumer, actions } = fetchedFormData;
    const hasAllPrivilege = !!ruleType.authorizedConsumers[consumer]?.all;
    const canExecuteActions = !!application.capabilities.actions?.execute;

    return hasAllPrivilege && (canExecuteActions || (!canExecuteActions && !actions.length));
  }, [ruleType, fetchedFormData, application]);

  if (isInitialLoading) {
    return (
      <RuleFormErrorPromptWrapper hasBorder={false} hasShadow={false}>
        <EuiLoadingElastic size="xl" />
      </RuleFormErrorPromptWrapper>
    );
  }

  if (!fetchedFormData) {
    return (
      <RuleFormErrorPromptWrapper hasBorder={false} hasShadow={false}>
        <RuleFormResolveRuleError />
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

  if (!canEditRule) {
    return (
      <RuleFormErrorPromptWrapper hasBorder={false} hasShadow={false}>
        <RuleFormActionPermissionError />
      </RuleFormErrorPromptWrapper>
    );
  }

  const actionsWithFrequency = fetchedFormData.actions.map((action) => {
    const isSystemAction = connectorTypes.some((connectorType) => {
      return connectorType.id === action.actionTypeId && connectorType.isSystemActionType;
    });

    if (!isSystemAction && fetchedFormData.notifyWhen) {
      return {
        ...action,
        frequency: {
          notifyWhen: fetchedFormData.notifyWhen ?? 'onActionGroupChange',
          throttle: fetchedFormData.throttle ?? null,
          summary: false,
        },
      };
    }
    return action;
  });

  const RuleFormUIComponent = isFlyout ? RuleFlyout : RulePage;

  return (
    <RuleFormStateProvider
      initialRuleFormState={{
        connectors,
        connectorTypes,
        alertFields,
        formData: {
          ...getDefaultFormData({
            ruleTypeId: fetchedFormData.ruleTypeId,
            name: fetchedFormData.name,
            consumer: fetchedFormData.consumer,
            actions: fetchedFormData.actions,
          }),
          ...fetchedFormData,
          actions: actionsWithFrequency,
        },
        id,
        metadata: initialMetadata,
        plugins,
        minimumScheduleInterval: uiConfig?.minimumScheduleInterval,
        selectedRuleType: ruleType,
        selectedRuleTypeModel: ruleTypeModel,
        availableRuleTypes: getAvailableRuleTypes({
          consumer: fetchedFormData.consumer,
          ruleTypes,
          ruleTypeRegistry,
        }).map(({ ruleType: rt }) => rt),
        flappingSettings,
        validConsumers: DEFAULT_VALID_CONSUMERS,
        showMustacheAutocompleteSwitch,
      }}
    >
      <RuleFormUIComponent
        isEdit
        isSaving={isSaving}
        onSave={onSave}
        onCancel={onCancel}
        onChangeMetaData={onChangeMetaData}
        initialEditStep={initialEditStep}
      />
    </RuleFormStateProvider>
  );
};
