/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback, useMemo } from 'react';
import { EuiEmptyPrompt, EuiLoadingSpinner, EuiText } from '@elastic/eui';
import type { RuleFormData, RuleFormPlugins } from './types';
import { RuleFormStateProvider } from './rule_form_state';
import {
  useLoadUiConfig,
  useHealthCheck,
  useUpdateRule,
  useResolveRule,
  useLoadRuleTypesQuery,
} from '../common/hooks';

import { RulePage } from './rule_page';
import { RuleFormHealthCheckError } from './rule_form_health_check_error';
import {
  RULE_FORM_RULE_NOT_FOUND_ERROR_TITLE,
  RULE_FORM_RULE_NOT_FOUND_ERROR_TEXT,
} from './translations';

export interface EditRuleFormProps {
  id: string;
  plugins: RuleFormPlugins;
}

export const EditRuleForm = (props: EditRuleFormProps) => {
  const { id, plugins } = props;
  const { http, toasts, docLinks, ruleTypeRegistry } = plugins;

  const { data, isLoading: isLoadingUiConfig } = useLoadUiConfig({ http });
  const { error, isLoading: isLoadingHealthCheck } = useHealthCheck({ http });
  const {
    ruleTypesState: { data: ruleTypeIndex, isLoading: isLoadingRuleTypes },
  } = useLoadRuleTypesQuery({
    http,
    toasts,
  });

  const { mutate, isLoading: isSaving } = useUpdateRule({ http });

  const { data: fetchedFormData, isLoading: isLoadingRule } = useResolveRule({ http, id });

  const onSave = useCallback(
    (newFormData: RuleFormData) => {
      mutate({
        id,
        formData: newFormData,
      });
    },
    [id, mutate]
  );

  const ruleTypes = [...ruleTypeIndex.values()];
  const ruleType = ruleTypes.find((rt) => rt.id === fetchedFormData?.ruleTypeId);

  const ruleTypeModel = useMemo(() => {
    let model;
    try {
      model = ruleTypeRegistry.get(fetchedFormData?.ruleTypeId || '');
    } catch (e) {
      return null;
    }
    return model;
  }, [ruleTypeRegistry, fetchedFormData]);

  if (isLoadingUiConfig || isLoadingHealthCheck || isLoadingRule || isLoadingRuleTypes) {
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

  if (error) {
    return <RuleFormHealthCheckError error={error} docLinks={docLinks} />;
  }

  return (
    <div>
      <RuleFormStateProvider
        initialRuleFormState={{
          formData: fetchedFormData,
          id,
          plugins,
          minimumScheduleInterval: data?.minimumScheduleInterval,
          selectedRuleTypeModel: ruleTypeModel,
        }}
      >
        <RulePage
          isEdit
          selectedRuleTypeModel={ruleTypeModel}
          selectedRuleType={ruleType}
          isSaving={isSaving}
          onCancel={() => {}}
          onSave={onSave}
        />
      </RuleFormStateProvider>
    </div>
  );
};
