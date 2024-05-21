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
import type { RuleFormCommonProps, RuleFormData } from './types';
import { GET_DEFAULT_FORM_DATA } from './constants';
import { RuleFormStateProvider } from './rule_form_state';
import { useLoadUiConfig, useHealthCheck, useCreateRule } from '../common/hooks';

import { RulePage } from './rule_page';
import { RuleFormHealthCheckError } from './rule_form_health_check_error';

export type CreateRuleFormProps = {
  formData?: RuleFormData;
  consumer: RuleCreationValidConsumer;
  canChangeTrigger?: boolean;
  hideGrouping?: boolean;
  filteredRuleTypes?: string[];
  validConsumers?: RuleCreationValidConsumer[];
  useRuleProducer?: boolean;
  initialSelectedConsumer?: RuleCreationValidConsumer | null;
} & RuleFormCommonProps;

export const CreateRuleForm = (props: CreateRuleFormProps) => {
  const { formData, plugins, metadata, ruleTypeModel, ruleType, validConsumers, onCancel } = props;

  const { http, docLinks } = plugins;

  const { data, isLoading: isLoadingUiConfig } = useLoadUiConfig({ http });
  const { error, isLoading: isLoadingHealthCheck } = useHealthCheck({ http });

  const { mutate, isLoading: isSaving } = useCreateRule({ http });

  const onSave = useCallback(
    (newFormData: RuleFormData) => {
      mutate({ formData: newFormData });
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
    <RuleFormStateProvider
      initialRuleFormState={{
        formData:
          formData ||
          GET_DEFAULT_FORM_DATA({
            ruleTypeId: ruleType.id,
            name: `${ruleType.name} rule`,
          }),
        plugins,
        minimumScheduleInterval: data?.minimumScheduleInterval,
        metadata,
        selectedRuleTypeModel: ruleTypeModel,
      }}
    >
      <RulePage
        canShowConsumerSelection
        selectedRuleTypeModel={ruleTypeModel}
        selectedRuleType={ruleType}
        validConsumers={validConsumers}
        isSaving={isSaving}
        onCancel={onCancel}
        onSave={onSave}
      />
    </RuleFormStateProvider>
  );
};
