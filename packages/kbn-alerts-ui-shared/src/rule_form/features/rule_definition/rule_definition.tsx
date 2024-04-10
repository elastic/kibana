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
  EuiIconTip,
  EuiAccordion,
  EuiPanel,
  EuiSpacer,
  EuiErrorBoundary,
  EuiCallOut,
  useEuiTheme,
} from '@elastic/eui';
import React, { Suspense, useMemo, useState, useCallback } from 'react';
import { DocLinksStart } from '@kbn/core-doc-links-browser';
import {
  RuleCreationValidConsumer,
  ES_QUERY_ID,
  OBSERVABILITY_THRESHOLD_RULE_TYPE_ID,
  ML_ANOMALY_DETECTION_RULE_TYPE_ID,
} from '@kbn/rule-data-utils';
import { useRuleType, useValidation } from '../../contexts';
import { useRuleFormSelector, useRuleFormDispatch, useAuthorizedConsumers } from '../../hooks';
import { RuleTypeParamsExpressionPlugins } from '../../types';
import { setParam, replaceParams, useSelectAreAdvancedOptionsSet } from './slice';
import { RuleScheduleField } from './rule_schedule_field';
import { RuleFormConsumerSelection } from './rule_form_consumer_selection';
import { RuleAlertDelayField } from './rule_alert_delay_field';
import { expressionFocus } from '../../store/meta_slice';
import { ValidationStatus } from '../../common/constants';
import { flattenErrorObject } from '../../common/validation_error';

interface RuleDefinitionProps {
  expressionPlugins: RuleTypeParamsExpressionPlugins;
  docLinks: DocLinksStart;
  canShowConsumerSelection?: boolean;
  validConsumers?: RuleCreationValidConsumer[];
}

const MULTI_CONSUMER_RULE_TYPE_IDS = [
  OBSERVABILITY_THRESHOLD_RULE_TYPE_ID,
  ES_QUERY_ID,
  ML_ANOMALY_DETECTION_RULE_TYPE_ID,
];

export const RuleDefinition: React.FC<RuleDefinitionProps> = ({
  expressionPlugins,
  docLinks,
  canShowConsumerSelection = false,
  validConsumers = [],
}) => {
  const [metadata, setMetadata] = useState();
  const onChangeMetaData = useCallback((newMetadata) => setMetadata(newMetadata), []);

  const ruleId = useRuleFormSelector((state) => state.ruleDefinition.id);
  const ruleParams = useRuleFormSelector((state) => state.ruleDefinition.params);
  const {
    errors: { params: ruleParamsErrors },
    status: ruleDefinitionValidationStatus,
  } = useValidation().ruleDefinition;
  const ruleInterval = useRuleFormSelector((state) => state.ruleDefinition.schedule.interval);
  const ruleTypeModel = useRuleType();
  const dispatch = useRuleFormDispatch();

  const { euiTheme } = useEuiTheme();
  const authorizedConsumers = useAuthorizedConsumers(ruleTypeModel, validConsumers);

  // TODO: Hide this in edit mode
  const shouldShowConsumerSelect = useMemo(() => {
    if (!canShowConsumerSelection) {
      return false;
    }
    if (!authorizedConsumers.length) {
      return false;
    }
    return !!ruleTypeModel.id && MULTI_CONSUMER_RULE_TYPE_IDS.includes(ruleTypeModel.id);
  }, [authorizedConsumers, ruleTypeModel, canShowConsumerSelection]);

  const RuleParamsExpressionComponent = ruleTypeModel.ruleParamsExpression ?? null;

  const docsUrl = useMemo(
    () =>
      typeof ruleTypeModel.documentationUrl === 'function'
        ? ruleTypeModel.documentationUrl(docLinks)
        : ruleTypeModel.documentationUrl,
    [ruleTypeModel, docLinks]
  );

  const advancedOptionsInitialIsOpen = useSelectAreAdvancedOptionsSet();

  const ruleParamsErrorList = useMemo(() => {
    if (ruleDefinitionValidationStatus === ValidationStatus.INVALID) {
      return flattenErrorObject(ruleParamsErrors);
    } else {
      return null;
    }
  }, [ruleParamsErrors, ruleDefinitionValidationStatus]);

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
                  {i18n.translate('alertsUIShared.ruleForm.ruleDefinition.documentationLink', {
                    defaultMessage: 'View documentation',
                  })}
                </EuiLink>
              </EuiText>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiSplitPanel.Inner>
      <EuiSplitPanel.Inner>
        {RuleParamsExpressionComponent && (
          <Suspense
            fallback={
              <EuiEmptyPrompt
                title={<EuiLoadingSpinner size="xl" />}
                body={i18n.translate(
                  'alertsUIShared.ruleForm.ruleDefinition.loadingRuleTypeParams',
                  {
                    defaultMessage: 'Loading rule type params',
                  }
                )}
              />
            }
          >
            {/*
             * Backwards compatibility with expression components that call setParam to populate default params.
             * Capture when the user focuses on the expression component. Until the user interacts
             * with the expression, validation errors should not be shown, and the rule definition
             * should only be marked as incomplete if there are validation errors.
             */}
            <div onFocusCapture={() => dispatch(expressionFocus())}>
              {ruleParamsErrorList && (
                <EuiCallOut
                  size="s"
                  color="danger"
                  iconType="warning"
                  title={ruleParamsErrorList.join(' ')}
                />
              )}
              <EuiErrorBoundary>
                <RuleParamsExpressionComponent
                  id={ruleId}
                  ruleParams={ruleParams}
                  ruleInterval={ruleInterval}
                  ruleThrottle={''}
                  errors={ruleParamsErrors}
                  setRuleParams={(key, value) => dispatch(setParam([key, value]))}
                  setRuleProperty={(_, value) => {
                    /* setRuleProperty is only ever used to replace all params */
                    dispatch(replaceParams(value));
                  }}
                  defaultActionGroupId={'default'}
                  actionGroups={[{ id: 'default', name: 'Default' }]}
                  metadata={metadata}
                  onChangeMetaData={onChangeMetaData}
                  {...expressionPlugins}
                />
              </EuiErrorBoundary>
            </div>
          </Suspense>
        )}
      </EuiSplitPanel.Inner>
      <EuiSplitPanel.Inner style={{ borderTop: `1px solid ${euiTheme.colors.lightShade}` }}>
        <EuiDescribedFormGroup
          fullWidth
          title={
            <h3>
              {i18n.translate('alertsUIShared.ruleForm.ruleDefinition.scheduleTitle', {
                defaultMessage: 'Rule schedule',
              })}
            </h3>
          }
          description={
            <p>
              {i18n.translate('alertsUIShared.ruleForm.ruleDefinition.scheduleDescription', {
                defaultMessage: 'Set the frequency to check the alert conditions',
              })}{' '}
              <EuiIconTip
                position="right"
                type="questionInCircle"
                content={i18n.translate(
                  'alertsUIShared.ruleForm.ruleDefinition.ruleScheduleTooltip',
                  {
                    defaultMessage:
                      'Checks are queued; they run as close to the defined value as capacity allows.',
                  }
                )}
              />
            </p>
          }
        >
          <EuiFormRow fullWidth>
            <RuleScheduleField />
          </EuiFormRow>
        </EuiDescribedFormGroup>
        {shouldShowConsumerSelect && (
          <EuiDescribedFormGroup
            fullWidth
            title={
              <h3>
                {i18n.translate('alertsUIShared.ruleForm.ruleDefinition.scopeTitle', {
                  defaultMessage: 'Rule scope',
                })}
              </h3>
            }
            description={
              <p>
                {i18n.translate('alertsUIShared.ruleForm.ruleDefinition.scopeDescription', {
                  defaultMessage:
                    'Select the applications to associate the corresponding role privilege',
                })}
              </p>
            }
          >
            <EuiFormRow fullWidth>
              <RuleFormConsumerSelection validConsumers={authorizedConsumers} />
            </EuiFormRow>
          </EuiDescribedFormGroup>
        )}
        <EuiFlexItem>
          <EuiAccordion
            id="advancedOptionsAccordion"
            data-test-subj="advancedOptionsAccordion"
            initialIsOpen={advancedOptionsInitialIsOpen}
            buttonContent={
              <EuiText size="s">
                {i18n.translate('alertsUIShared.ruleForm.ruleDefinition.advancedOptionsLabel', {
                  defaultMessage: 'Advanced options',
                })}
              </EuiText>
            }
          >
            <EuiSpacer size="s" />
            <EuiPanel hasShadow={false} hasBorder color="subdued">
              <EuiDescribedFormGroup
                fullWidth
                title={
                  <h4>
                    {i18n.translate('alertsUIShared.ruleForm.ruleDefinition.alertDelayTitle', {
                      defaultMessage: 'Alert delay',
                    })}
                  </h4>
                }
                description={
                  <EuiText size="s">
                    <p>
                      {i18n.translate('alertsUIShared.ruleForm.ruleDefinition.scopeDescription', {
                        defaultMessage:
                          'Set the number of consecutive runs for which this rule must meet the alert conditions before an alert occurs',
                      })}
                    </p>
                  </EuiText>
                }
              >
                <EuiFormRow fullWidth data-test-subj="alertDelayFormRow" display="rowCompressed">
                  <RuleAlertDelayField />
                </EuiFormRow>
              </EuiDescribedFormGroup>
            </EuiPanel>
          </EuiAccordion>
        </EuiFlexItem>
      </EuiSplitPanel.Inner>
    </EuiSplitPanel.Outer>
  );
};
