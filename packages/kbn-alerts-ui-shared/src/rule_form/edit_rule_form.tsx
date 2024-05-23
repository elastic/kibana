/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback } from 'react';
import { EuiLoadingSpinner } from '@elastic/eui';
import type { RuleFormData, RuleFormPlugins } from './types';
import { RuleFormStateProvider } from './rule_form_state';
import { useUpdateRule } from '../common/hooks';
import { RulePage } from './rule_page';
import { RuleFormHealthCheckError } from './rule_form_errors/rule_form_health_check_error';
import { useLoadDependencies } from './hooks/use_load_dependencies';
import { RuleFormRuleOrRuleTypeError } from './rule_form_errors';
import { RULE_EDIT_SUCCESS_TEXT } from './translations';

export interface EditRuleFormProps {
  id: string;
  plugins: RuleFormPlugins;
}

export const EditRuleForm = (props: EditRuleFormProps) => {
  const { id, plugins } = props;
  const { http, notification, docLinks, ruleTypeRegistry } = plugins;
  const { toasts } = notification;

  const { mutate, isLoading: isSaving } = useUpdateRule({
    http,
    onSuccess: ({ name }) => {
      toasts.addSuccess(RULE_EDIT_SUCCESS_TEXT(name));
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
        formData: newFormData,
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
