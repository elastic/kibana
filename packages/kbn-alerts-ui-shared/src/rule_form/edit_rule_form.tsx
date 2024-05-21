/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback } from 'react';
import { EuiLoadingSpinner } from '@elastic/eui';
import type { RuleFormCommonProps, RuleFormData } from './types';
import { RuleFormStateProvider } from './rule_form_state';
import { useLoadUiConfig, useHealthCheck, useUpdateRule } from '../common/hooks';

import { RulePage } from './rule_page';
import { RuleFormHealthCheckError } from './rule_form_health_check_error';

export type EditRuleFormProps = {
  formData: RuleFormData;
} & RuleFormCommonProps;

export const EditRuleForm = (props: EditRuleFormProps) => {
  const { formData, plugins, metadata, ruleTypeModel, ruleType, onCancel } = props;

  const { http, docLinks } = plugins;

  const { data, isLoading: isLoadingUiConfig } = useLoadUiConfig({ http });
  const { error, isLoading: isLoadingHealthCheck } = useHealthCheck({ http });

  const { mutate, isLoading: isSaving } = useUpdateRule({ http });

  const onSave = useCallback(
    (newFormData: RuleFormData) => {
      mutate({
        id: newFormData.id!,
        formData: newFormData,
      });
    },
    [mutate]
  );

  if (isLoadingUiConfig || isLoadingHealthCheck) {
    return <EuiLoadingSpinner />;
  }

  if (error) {
    return <RuleFormHealthCheckError error={error} docLinks={docLinks} />;
  }

  return (
    <div>
      <RuleFormStateProvider
        initialRuleFormState={{
          formData,
          plugins,
          minimumScheduleInterval: data?.minimumScheduleInterval,
          metadata,
          selectedRuleTypeModel: ruleTypeModel,
        }}
      >
        <RulePage
          isEdit
          selectedRuleTypeModel={ruleTypeModel}
          selectedRuleType={ruleType}
          isSaving={isSaving}
          onCancel={onCancel}
          onSave={onSave}
        />
      </RuleFormStateProvider>
    </div>
  );
};
