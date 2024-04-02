/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import {
  EuiEmptyPrompt,
  EuiLoadingSpinner,
  EuiSplitPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiLink,
  EuiDescribedFormGroup,
  EuiFormRow,
  useEuiTheme,
} from '@elastic/eui';
import React, { Suspense, useMemo } from 'react';
import { DocLinksStart } from '@kbn/core-doc-links-browser';
import { useRuleFormSelector, useRuleFormDispatch } from '../../hooks';
import { RuleTypeModel, RuleTypeParamsExpressionPlugins } from '../../types';
import { setParam, replaceParams } from './slice';

interface RuleDefinitionProps {
  ruleTypeModel: RuleTypeModel;
  expressionPlugins: RuleTypeParamsExpressionPlugins;
  docLinks: DocLinksStart;
}

export const RuleDefinition: React.FC<RuleDefinitionProps> = ({
  ruleTypeModel,
  expressionPlugins,
  docLinks,
}) => {
  const ruleId = useRuleFormSelector((state) => state.ruleDefinition.id);
  const ruleParams = useRuleFormSelector((state) => state.ruleDefinition.params);
  const dispatch = useRuleFormDispatch();

  const { euiTheme } = useEuiTheme();

  const RuleParamsExpressionComponent = ruleTypeModel.ruleParamsExpression ?? null;

  const { errors } = ruleTypeModel.validate(ruleParams);
  const docsUrl = useMemo(
    () =>
      typeof ruleTypeModel.documentationUrl === 'function'
        ? ruleTypeModel.documentationUrl(docLinks)
        : ruleTypeModel.documentationUrl,
    [ruleTypeModel, docLinks]
  );

  return (
    <EuiSplitPanel.Outer hasShadow={false} hasBorder>
      <EuiSplitPanel.Inner
        color="subdued"
        style={{ borderBottom: `1px solid ${euiTheme.colors.lightShade}` }}
      >
        <EuiFlexGroup gutterSize="s">
          <EuiFlexItem grow={false}>
            <EuiText size="xs">
              <strong>{ruleTypeModel.name}</strong>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="xs">{ruleTypeModel.description}</EuiText>
          </EuiFlexItem>
          {docsUrl && (
            <EuiFlexItem grow={false}>
              <EuiText size="xs">
                <EuiLink href={docsUrl} target="_blank">
                  {i18n.translate('alertsUIShared.ruleFormPage.documentationLink', {
                    defaultMessage: 'View documentation',
                  })}
                </EuiLink>
              </EuiText>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiSplitPanel.Inner>
      <EuiSplitPanel.Inner>
        <Suspense
          fallback={
            <EuiEmptyPrompt
              title={<EuiLoadingSpinner size="xl" />}
              body={i18n.translate('alertsUIShared.ruleFormPage.loadingRuleTypeParams', {
                defaultMessage: 'Loading rule type params',
              })}
            />
          }
        >
          <RuleParamsExpressionComponent
            id={ruleId}
            ruleParams={ruleParams}
            ruleInterval={'1m'}
            ruleThrottle={''}
            alertNotifyWhen={'onActionGroupChange'}
            errors={errors}
            setRuleParams={(key, value) => dispatch(setParam([key, value]))}
            setRuleProperty={(_, value) => {
              /* setRuleProperty is only ever used to replace all params */
              /* Deprecated in favor of defining default parameters */
              dispatch(replaceParams(value));
            }}
            defaultActionGroupId={'default'}
            actionGroups={[{ id: 'default', name: 'Default' }]}
            metadata={{}}
            onChangeMetaData={() => {}}
            {...expressionPlugins}
          />
        </Suspense>
      </EuiSplitPanel.Inner>
      <EuiSplitPanel.Inner style={{ borderTop: `1px solid ${euiTheme.colors.lightShade}` }}>
        <EuiDescribedFormGroup
          fullWidth
          title={
            <h3>
              {i18n.translate('alertsUIShared.ruleFormPage.ruleDefinition.scheduleTitle', {
                defaultMessage: 'Rule schedule',
              })}
            </h3>
          }
          description={
            <p>
              {i18n.translate('alertsUIShared.ruleFormPage.ruleDefinition.scheduleDescription', {
                defaultMessage: 'Set the frequency to check the alert conditions',
              })}
            </p>
          }
        >
          <EuiFormRow fullWidth>
            <div />
          </EuiFormRow>
        </EuiDescribedFormGroup>
        <EuiDescribedFormGroup
          fullWidth
          title={
            <h3>
              {i18n.translate('alertsUIShared.ruleFormPage.ruleDefinition.scopeTitle', {
                defaultMessage: 'Rule scope',
              })}
            </h3>
          }
          description={
            <p>
              {i18n.translate('alertsUIShared.ruleFormPage.ruleDefinition.scopeDescription', {
                defaultMessage:
                  'Select the applications to associate the corresponding role privilege',
              })}
            </p>
          }
        >
          <EuiFormRow fullWidth>
            <div />
          </EuiFormRow>
        </EuiDescribedFormGroup>
      </EuiSplitPanel.Inner>
    </EuiSplitPanel.Outer>
  );
};
