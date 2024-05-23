/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback } from 'react';
import { EuiLoadingSpinner } from '@elastic/eui';
import type { RuleCreationValidConsumer } from '@kbn/rule-data-utils';
import type { RuleFormData, RuleFormPlugins } from './types';
import { ALERTING_FEATURE_ID, DEFAULT_VALID_CONSUMERS, GET_DEFAULT_FORM_DATA } from './constants';
import { RuleFormStateProvider } from './rule_form_state';
import { useCreateRule } from '../common/hooks';
import { RulePage } from './rule_page';
import { RuleFormHealthCheckError, RuleFormRuleOrRuleTypeError } from './rule_form_errors';
import { useLoadDependencies } from './hooks/use_load_dependencies';
import { getInitialMultiConsumer } from './utils';
import { RULE_CREATE_SUCCESS_TEXT } from './translations';

export interface CreateRuleFormProps {
  ruleTypeId: string;
  plugins: RuleFormPlugins;
  consumer?: string;
  multiConsumerSelection?: RuleCreationValidConsumer | null;
  hideInterval?: boolean;
  validConsumers?: RuleCreationValidConsumer[];
  filteredRuleTypes?: string[];
  useRuleProducer?: boolean;
}

export const CreateRuleForm = (props: CreateRuleFormProps) => {
  const {
    ruleTypeId,
    plugins,
    consumer = ALERTING_FEATURE_ID,
    multiConsumerSelection,
    validConsumers = DEFAULT_VALID_CONSUMERS,
    filteredRuleTypes = [],
  } = props;

  const { http, docLinks, notification, ruleTypeRegistry } = plugins;
  const { toasts } = notification;

  const { mutate, isLoading: isSaving } = useCreateRule({
    http,
    onSuccess: ({ name }) => {
      toasts.addSuccess(RULE_CREATE_SUCCESS_TEXT(name));
    },
  });

  const { isLoading, ruleType, ruleTypeModel, uiConfig, healthCheckError } = useLoadDependencies({
    http,
    toasts: notification.toasts,
    ruleTypeRegistry,
    ruleTypeId,
    consumer,
    validConsumers,
    filteredRuleTypes,
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
    return <RuleFormRuleOrRuleTypeError />;
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
          consumer,
        }),
        plugins,
        minimumScheduleInterval: uiConfig?.minimumScheduleInterval,
        selectedRuleTypeModel: ruleTypeModel,
        selectedRuleType: ruleType,
        multiConsumerSelection: getInitialMultiConsumer({
          multiConsumerSelection,
          validConsumers,
          ruleType,
        }),
      }}
    >
      <RulePage
        canShowConsumerSelection
        validConsumers={validConsumers}
        isSaving={isSaving}
        onSave={onSave}
      />
    </RuleFormStateProvider>
  );
};
