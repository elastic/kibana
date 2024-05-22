/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback } from 'react';
import { EuiEmptyPrompt, EuiLoadingSpinner, EuiText } from '@elastic/eui';
import type { RuleFormData, RuleFormPlugins } from './types';
import { RuleFormStateProvider } from './rule_form_state';
import { useUpdateRule } from '../common/hooks';

import { RulePage } from './rule_page';
import { RuleFormHealthCheckError } from './rule_form_health_check_error';
import {
  RULE_FORM_RULE_NOT_FOUND_ERROR_TITLE,
  RULE_FORM_RULE_NOT_FOUND_ERROR_TEXT,
} from './translations';
import { useLoadDependencies } from './hooks/use_load_dependencies';

export interface EditRuleFormProps {
  id: string;
  plugins: RuleFormPlugins;
}

export const EditRuleForm = (props: EditRuleFormProps) => {
  const { id, plugins } = props;
  const { http, notification, docLinks, ruleTypeRegistry } = plugins;

  const { mutate, isLoading: isSaving } = useUpdateRule({ http });

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
    return (
      <EuiEmptyPrompt
        color="danger"
        iconType="error"
        title={<h2>{RULE_FORM_RULE_NOT_FOUND_ERROR_TITLE}</h2>}
        body={
          <EuiText>
            <p>{RULE_FORM_RULE_NOT_FOUND_ERROR_TEXT}</p>
          </EuiText>
        }
      />
    );
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
          selectedRuleTypeModel: ruleTypeModel,
        }}
      >
        <RulePage
          isEdit
          selectedRuleTypeModel={ruleTypeModel}
          selectedRuleType={ruleType}
          isSaving={isSaving}
          onSave={onSave}
        />
      </RuleFormStateProvider>
    </div>
  );
};
