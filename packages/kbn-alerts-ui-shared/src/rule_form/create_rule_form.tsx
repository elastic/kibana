/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback, useMemo } from 'react';
import { EuiEmptyPrompt, EuiLoadingSpinner, EuiText } from '@elastic/eui';
// import type { RuleCreationValidConsumer } from '@kbn/rule-data-utils';
import type { RuleFormData, RuleFormPlugins } from './types';
import { GET_DEFAULT_FORM_DATA } from './constants';
import { RuleFormStateProvider } from './rule_form_state';
import {
  useLoadUiConfig,
  useHealthCheck,
  useCreateRule,
  useLoadRuleTypesQuery,
} from '../common/hooks';

import { RulePage } from './rule_page';
import { RuleFormHealthCheckError } from './rule_form_health_check_error';
import {
  RULE_FORM_RULE_NOT_FOUND_ERROR_TITLE,
  RULE_FORM_RULE_NOT_FOUND_ERROR_TEXT,
} from './translations';

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
  const { http, docLinks, toasts, ruleTypeRegistry } = plugins;

  const { data, isLoading: isLoadingUiConfig } = useLoadUiConfig({ http });
  const { error, isLoading: isLoadingHealthCheck } = useHealthCheck({ http });
  const {
    ruleTypesState: { data: ruleTypeIndex, isLoading: isLoadingRuleTypes },
  } = useLoadRuleTypesQuery({
    http,
    toasts,
  });

  const { mutate, isLoading: isSaving } = useCreateRule({ http });

  const onSave = useCallback(
    (newFormData: RuleFormData) => {
      mutate({ formData: newFormData });
    },
    [mutate]
  );

  const ruleTypes = [...ruleTypeIndex.values()];
  const ruleType = ruleTypes.find((rt) => rt.id === ruleTypeId);
  const ruleTypeModel = useMemo(() => {
    let model;
    try {
      model = ruleTypeRegistry.get(ruleTypeId);
    } catch (e) {
      return null;
    }
    return model;
  }, [ruleTypeId, ruleTypeRegistry]);

  if (isLoadingUiConfig || isLoadingHealthCheck || isLoadingRuleTypes) {
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

  if (error) {
    return <RuleFormHealthCheckError error={error} docLinks={docLinks} />;
  }

  return (
    <RuleFormStateProvider
      initialRuleFormState={{
        formData: GET_DEFAULT_FORM_DATA({
          ruleTypeId,
          name: `${ruleType.name} rule`,
        }),
        plugins,
        minimumScheduleInterval: data?.minimumScheduleInterval,
        selectedRuleTypeModel: ruleTypeModel,
      }}
    >
      <RulePage
        canShowConsumerSelection
        selectedRuleTypeModel={ruleTypeModel}
        selectedRuleType={ruleType}
        // validConsumers={validConsumers}
        isSaving={isSaving}
        onCancel={() => {}}
        onSave={onSave}
      />
    </RuleFormStateProvider>
  );
};
