/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback } from 'react';
import { EuiLoadingSpinner } from '@elastic/eui';
import { toMountPoint } from '@kbn/react-kibana-mount';
import type { RuleFormData, RuleFormPlugins } from './types';
import { RuleFormStateProvider } from './rule_form_state';
import { useUpdateRule } from '../common/hooks';
import { RulePage } from './rule_page';
import { RuleFormHealthCheckError } from './rule_form_errors/rule_form_health_check_error';
import { useLoadDependencies } from './hooks/use_load_dependencies';
import { RuleFormCircuitBreakerError, RuleFormRuleOrRuleTypeError } from './rule_form_errors';
import { RULE_EDIT_ERROR_TEXT, RULE_EDIT_SUCCESS_TEXT } from './translations';
import { parseRuleCircuitBreakerErrorMessage } from './utils';

export interface EditRuleFormProps {
  id: string;
  plugins: RuleFormPlugins;
}

export const EditRuleForm = (props: EditRuleFormProps) => {
  const { id, plugins } = props;
  const { http, notification, docLinks, ruleTypeRegistry, i18n, theme } = plugins;
  const { toasts } = notification;

  const { mutate, isLoading: isSaving } = useUpdateRule({
    http,
    onSuccess: ({ name }) => {
      toasts.addSuccess(RULE_EDIT_SUCCESS_TEXT(name));
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
            { i18n, theme }
          ),
        }),
      });
    },
  });

  const { isLoading, ruleType, ruleTypeModel, uiConfig, healthCheckError, fetchedFormData } =
    useLoadDependencies({
      http,
      toasts: notification.toasts,
      ruleTypeRegistry,
      id,
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
          // TODO: Will add actions in the actions PR
          actions: [],
          notifyWhen: newFormData.notifyWhen,
          alertDelay: newFormData.alertDelay,
        },
      });
    },
    [id, mutate]
  );

  if (isLoading) {
    return <EuiLoadingSpinner />;
  }

  if (!ruleType || !ruleTypeModel || !fetchedFormData) {
    return <RuleFormRuleOrRuleTypeError />;
  }

  if (healthCheckError) {
    return <RuleFormHealthCheckError error={healthCheckError} docLinks={docLinks} />;
  }

  return (
    <div>
      <RuleFormStateProvider
        initialRuleFormState={{
          formData: fetchedFormData,
          id,
          plugins,
          minimumScheduleInterval: uiConfig?.minimumScheduleInterval,
          selectedRuleType: ruleType,
          selectedRuleTypeModel: ruleTypeModel,
        }}
      >
        <RulePage isEdit isSaving={isSaving} onSave={onSave} />
      </RuleFormStateProvider>
    </div>
  );
};
