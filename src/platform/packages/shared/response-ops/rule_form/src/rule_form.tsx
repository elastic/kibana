/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiEmptyPrompt, EuiText } from '@elastic/eui';
import type { RuleCreationValidConsumer } from '@kbn/rule-data-utils';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { useMemo } from 'react';
import { CreateRuleForm } from './create_rule_form';
import { EditRuleForm } from './edit_rule_form';
import './rule_form.scss';
import { RuleFormScreenContextProvider } from './rule_form_screen_context';
import {
  RULE_FORM_ROUTE_PARAMS_ERROR_TEXT,
  RULE_FORM_ROUTE_PARAMS_ERROR_TITLE,
} from './translations';
import { RuleFormData, RuleFormPlugins } from './types';

const queryClient = new QueryClient();

export interface RuleFormProps {
  plugins: RuleFormPlugins;
  id?: string;
  ruleTypeId?: string;
  isFlyout?: boolean;
  onCancel?: () => void;
  onSubmit?: (ruleId: string) => void;
  consumer?: string;
  connectorFeatureId?: string;
  multiConsumerSelection?: RuleCreationValidConsumer | null;
  hideInterval?: boolean;
  validConsumers?: RuleCreationValidConsumer[];
  filteredRuleTypes?: string[];
  shouldUseRuleProducer?: boolean;
  canShowConsumerSelection?: boolean;
  showMustacheAutocompleteSwitch?: boolean;
  initialValues?: Partial<RuleFormData>;
}

export const RuleForm = (props: RuleFormProps) => {
  const {
    plugins: _plugins,
    onCancel,
    onSubmit,
    id,
    ruleTypeId,
    isFlyout,
    consumer,
    connectorFeatureId,
    multiConsumerSelection,
    hideInterval,
    validConsumers,
    filteredRuleTypes,
    shouldUseRuleProducer,
    canShowConsumerSelection,
    showMustacheAutocompleteSwitch,
    initialValues,
  } = props;

  const {
    http,
    i18n,
    theme,
    userProfile,
    application,
    notifications,
    charts,
    settings,
    data,
    dataViews,
    unifiedSearch,
    docLinks,
    ruleTypeRegistry,
    actionTypeRegistry,
  } = _plugins;

  const ruleFormComponent = useMemo(() => {
    const plugins = {
      http,
      i18n,
      theme,
      userProfile,
      application,
      notifications,
      charts,
      settings,
      data,
      dataViews,
      unifiedSearch,
      docLinks,
      ruleTypeRegistry,
      actionTypeRegistry,
    };
    if (id) {
      return (
        <EditRuleForm
          id={id}
          plugins={plugins}
          onCancel={onCancel}
          onSubmit={onSubmit}
          isFlyout={isFlyout}
          showMustacheAutocompleteSwitch={showMustacheAutocompleteSwitch}
          connectorFeatureId={connectorFeatureId}
        />
      );
    }
    if (ruleTypeId) {
      return (
        <CreateRuleForm
          ruleTypeId={ruleTypeId}
          plugins={plugins}
          onCancel={onCancel}
          onSubmit={onSubmit}
          isFlyout={isFlyout}
          consumer={consumer}
          connectorFeatureId={connectorFeatureId}
          multiConsumerSelection={multiConsumerSelection}
          hideInterval={hideInterval}
          validConsumers={validConsumers}
          filteredRuleTypes={filteredRuleTypes}
          shouldUseRuleProducer={shouldUseRuleProducer}
          canShowConsumerSelection={canShowConsumerSelection}
          showMustacheAutocompleteSwitch={showMustacheAutocompleteSwitch}
          initialValues={initialValues}
        />
      );
    }
    return (
      <EuiEmptyPrompt
        color="danger"
        iconType="error"
        title={<h2>{RULE_FORM_ROUTE_PARAMS_ERROR_TITLE}</h2>}
        body={
          <EuiText>
            <p>{RULE_FORM_ROUTE_PARAMS_ERROR_TEXT}</p>
          </EuiText>
        }
      />
    );
  }, [
    http,
    i18n,
    theme,
    userProfile,
    application,
    notifications,
    charts,
    settings,
    data,
    dataViews,
    unifiedSearch,
    docLinks,
    ruleTypeRegistry,
    actionTypeRegistry,
    id,
    ruleTypeId,
    onCancel,
    onSubmit,
    isFlyout,
    showMustacheAutocompleteSwitch,
    connectorFeatureId,
    consumer,
    multiConsumerSelection,
    hideInterval,
    validConsumers,
    filteredRuleTypes,
    shouldUseRuleProducer,
    canShowConsumerSelection,
  ]);

  return (
    <QueryClientProvider client={queryClient}>
      <RuleFormScreenContextProvider>
        <div className="ruleForm__container">{ruleFormComponent}</div>
      </RuleFormScreenContextProvider>
    </QueryClientProvider>
  );
};
