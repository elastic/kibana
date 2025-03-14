/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiEmptyPrompt, EuiText } from '@elastic/eui';
import React, { useMemo } from 'react';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { type RuleCreationValidConsumer } from '@kbn/rule-data-utils';
import { CreateRuleForm } from './create_rule_form';
import { EditRuleForm } from './edit_rule_form';
import './rule_form.scss';
import { RuleFormScreenContextProvider } from './rule_form_screen_context';
import {
  RULE_FORM_ROUTE_PARAMS_ERROR_TEXT,
  RULE_FORM_ROUTE_PARAMS_ERROR_TITLE,
} from './translations';
import { RuleFormData, RuleFormPlugins, RuleTypeMetaData } from './types';

const queryClient = new QueryClient();

export interface RuleFormProps<MetaData extends RuleTypeMetaData = RuleTypeMetaData> {
  plugins: RuleFormPlugins;
  id?: string;
  ruleTypeId?: string;
  isFlyout?: boolean;
  onCancel?: () => void;
  onSubmit?: (ruleId: string) => void;
  onChangeMetaData?: (metadata: MetaData) => void;
  consumer?: string;
  connectorFeatureId?: string;
  multiConsumerSelection?: RuleCreationValidConsumer | null;
  hideInterval?: boolean;
  validConsumers?: RuleCreationValidConsumer[];
  filteredRuleTypes?: string[];
  shouldUseRuleProducer?: boolean;
  canShowConsumerSelection?: boolean;
  showMustacheAutocompleteSwitch?: boolean;
  initialValues?: Partial<Omit<RuleFormData, 'ruleTypeId'>>;
  initialMetadata?: MetaData;
  isServerless?: boolean;
}

export const RuleForm = <MetaData extends RuleTypeMetaData = RuleTypeMetaData>(
  props: RuleFormProps<MetaData>
) => {
  const {
    plugins: _plugins,
    onCancel,
    onSubmit,
    onChangeMetaData,
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
    initialMetadata,
    isServerless,
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
    fieldsMetadata,
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
      fieldsMetadata,
    };

    // Passing the MetaData type all the way down the component hierarchy is unnecessary, this type is
    // only used for the benefit of consumers of the RuleForm component. Retype onChangeMetaData to ignore this type.
    const retypedOnChangeMetaData = onChangeMetaData as (metadata?: RuleTypeMetaData) => void;

    if (id) {
      return (
        <EditRuleForm
          id={id}
          plugins={plugins}
          onCancel={onCancel}
          onSubmit={onSubmit}
          onChangeMetaData={retypedOnChangeMetaData}
          isFlyout={isFlyout}
          showMustacheAutocompleteSwitch={showMustacheAutocompleteSwitch}
          connectorFeatureId={connectorFeatureId}
          initialMetadata={initialMetadata}
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
          onChangeMetaData={retypedOnChangeMetaData}
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
          initialMetadata={initialMetadata}
          isServerless={isServerless}
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
    isServerless,
    id,
    ruleTypeId,
    validConsumers,
    multiConsumerSelection,
    onCancel,
    onSubmit,
    onChangeMetaData,
    isFlyout,
    showMustacheAutocompleteSwitch,
    connectorFeatureId,
    initialMetadata,
    consumer,
    hideInterval,
    filteredRuleTypes,
    shouldUseRuleProducer,
    canShowConsumerSelection,
    initialValues,
    fieldsMetadata,
  ]);

  return (
    <QueryClientProvider client={queryClient}>
      <RuleFormScreenContextProvider>{ruleFormComponent}</RuleFormScreenContextProvider>
    </QueryClientProvider>
  );
};
