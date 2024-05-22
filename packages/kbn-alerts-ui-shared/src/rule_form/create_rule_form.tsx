/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback } from 'react';
import { EuiEmptyPrompt, EuiLoadingSpinner, EuiText } from '@elastic/eui';
// import type { RuleCreationValidConsumer } from '@kbn/rule-data-utils';
import type { RuleFormData, RuleFormPlugins } from './types';
import { GET_DEFAULT_FORM_DATA } from './constants';
import { RuleFormStateProvider } from './rule_form_state';
import { useCreateRule } from '../common/hooks';

import { RulePage } from './rule_page';
import { RuleFormHealthCheckError } from './rule_form_health_check_error';
import {
  RULE_FORM_RULE_NOT_FOUND_ERROR_TITLE,
  RULE_FORM_RULE_NOT_FOUND_ERROR_TEXT,
} from './translations';
import { useLoadDependencies } from './hooks/use_load_dependencies';

export interface CreateRuleFormProps {
  ruleTypeId: string;
  plugins: RuleFormPlugins;
  // formData?: RuleFormData;
  // consumer: RuleCreationValidConsumer;
  // canChangeTrigger?: boolean;
  // hideGrouping?: boolean;
  // filteredRuleTypes?: string[];
  // validConsumers?: RuleCreationValidConsumer[];
  // useRuleProducer?: boolean;
  // initialSelectedConsumer?: RuleCreationValidConsumer | null;
}

export const CreateRuleForm = (props: CreateRuleFormProps) => {
  // const { formData, plugins, ruleTypeModel, ruleType, validConsumers } = props;
  const { ruleTypeId, plugins } = props;
  const { http, docLinks, notification, ruleTypeRegistry } = plugins;

  const { mutate, isLoading: isSaving } = useCreateRule({ http });

  const { isLoading, ruleType, ruleTypeModel, uiConfig, healthCheckError } = useLoadDependencies({
    http,
    toasts: notification.toasts,
    ruleTypeRegistry,
    ruleTypeId,
  });

  const onSave = useCallback(
    (newFormData: RuleFormData) => {
      mutate({ formData: newFormData });
    },
    [mutate]
  );

  if (isLoading) {
    return <EuiLoadingSpinner />;
  }

  if (!ruleType || !ruleTypeModel) {
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
    <RuleFormStateProvider
      initialRuleFormState={{
        formData: GET_DEFAULT_FORM_DATA({
          ruleTypeId,
          name: `${ruleType.name} rule`,
        }),
        plugins,
        minimumScheduleInterval: uiConfig?.minimumScheduleInterval,
        selectedRuleTypeModel: ruleTypeModel,
      }}
    >
      <RulePage
        canShowConsumerSelection
        selectedRuleTypeModel={ruleTypeModel}
        selectedRuleType={ruleType}
        // validConsumers={validConsumers}
        isSaving={isSaving}
        onSave={onSave}
      />
    </RuleFormStateProvider>
  );
};
