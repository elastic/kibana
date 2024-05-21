/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { Suspense, useMemo, useState, useCallback } from 'react';
import {
  EuiEmptyPrompt,
  EuiLoadingSpinner,
  EuiSplitPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiLink,
  EuiDescribedFormGroup,
  EuiIconTip,
  EuiAccordion,
  EuiPanel,
  EuiSpacer,
  EuiErrorBoundary,
} from '@elastic/eui';
import {
  RuleCreationValidConsumer,
  ES_QUERY_ID,
  OBSERVABILITY_THRESHOLD_RULE_TYPE_ID,
  ML_ANOMALY_DETECTION_RULE_TYPE_ID,
} from '@kbn/rule-data-utils';
import type { RuleTypeModel } from '../types';
import {
  DOC_LINK_TITLE,
  LOADING_RULE_TYPE_PARAMS_TITLE,
  SCHEDULE_TITLE,
  SCHEDULE_DESCRIPTION_TEXT,
  SCHEDULE_TOOLTIP_TEXT,
  ALERT_DELAY_TITLE,
  SCOPE_TITLE,
  SCOPE_DESCRIPTION_TEXT,
  ADVANCED_OPTIONS_TITLE,
  ALERT_DELAY_DESCRIPTION_TEXT,
} from '../translations';
import { RuleAlertDelay } from './rule_alert_delay';
import { RuleConsumerSelection } from './rule_consumer_selection';
import { RuleSchedule } from './rule_schedule';
import { RuleTypeWithDescription } from '../../common/types';
import { useRuleFormState, useRuleFormDispatch } from '../hooks';

const MULTI_CONSUMER_RULE_TYPE_IDS = [
  OBSERVABILITY_THRESHOLD_RULE_TYPE_ID,
  ES_QUERY_ID,
  ML_ANOMALY_DETECTION_RULE_TYPE_ID,
];

interface RuleDefinitionProps {
  canShowConsumerSelection?: boolean;
  authorizedConsumers?: RuleCreationValidConsumer[];
  selectedRuleTypeModel: RuleTypeModel;
  selectedRuleType: RuleTypeWithDescription;
  validConsumers?: RuleCreationValidConsumer[];
}

export const RuleDefinition = (props: RuleDefinitionProps) => {
  const {
    canShowConsumerSelection = false,
    authorizedConsumers = [],
    selectedRuleTypeModel,
    selectedRuleType,
  } = props;

  const { formData, plugins, errors, metadata, id } = useRuleFormState();

  const dispatch = useRuleFormDispatch();

  const { charts, data, dataViews, unifiedSearch, docLinks } = plugins!;

  const { params, schedule, alertDelay, notifyWhen } = formData;

  const [isAdvancedOptionsVisible, setIsAdvancedOptionsVisible] = useState<boolean>(!!alertDelay);

  const shouldShowConsumerSelect = useMemo(() => {
    if (!canShowConsumerSelection) {
      return false;
    }
    if (!authorizedConsumers.length) {
      return false;
    }
    return (
      selectedRuleTypeModel.id && MULTI_CONSUMER_RULE_TYPE_IDS.includes(selectedRuleTypeModel.id)
    );
  }, [authorizedConsumers, selectedRuleTypeModel, canShowConsumerSelection]);

  const RuleParamsExpressionComponent = selectedRuleTypeModel.ruleParamsExpression ?? null;

  const docsUrl = useMemo(() => {
    const { documentationUrl } = selectedRuleTypeModel;
    if (typeof documentationUrl === 'function') {
      return documentationUrl(docLinks);
    }
    return documentationUrl;
  }, [selectedRuleTypeModel, docLinks]);

  const onToggleAdvancedOptions = useCallback((isOpen) => {
    setIsAdvancedOptionsVisible(isOpen);
  }, []);

  const onChangeMetaData = useCallback(
    (newMetadata) => {
      dispatch({
        type: 'setMetadata',
        payload: newMetadata,
      });
    },
    [dispatch]
  );

  const onSetRuleParams = useCallback(
    (property: string, value: unknown) => {
      dispatch({
        type: 'setParamsProperty',
        payload: {
          property,
          value,
        },
      });
    },
    [dispatch]
  );

  const onSetRuleProperty = useCallback(
    (property: string, value: unknown) => {
      dispatch({
        type: 'setRuleProperty',
        payload: {
          property,
          value,
        },
      });
    },
    [dispatch]
  );

  return (
    <EuiSplitPanel.Outer hasBorder hasShadow={false}>
      <EuiSplitPanel.Inner color="subdued">
        <EuiFlexGroup gutterSize="s">
          <EuiFlexItem grow={false} data-test-subj="ruleDefinitionHeaderRuleTypeName">
            <EuiText size="xs">
              <strong>{selectedRuleType.name}</strong>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false} data-test-subj="ruleDefinitionHeaderRuleTypeDescription">
            <EuiText size="xs">
              <p>{selectedRuleTypeModel.description}</p>
            </EuiText>
          </EuiFlexItem>
          {docsUrl && (
            <EuiFlexItem grow={false}>
              <EuiText size="xs">
                <EuiLink
                  href={docsUrl}
                  target="_blank"
                  data-test-subj="ruleDefinitionHeaderDocsLink"
                >
                  {DOC_LINK_TITLE}
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
                body={LOADING_RULE_TYPE_PARAMS_TITLE}
              />
            }
          >
            <EuiFlexGroup gutterSize="none" direction="column">
              <EuiFlexItem>
                <EuiErrorBoundary>
                  <RuleParamsExpressionComponent
                    id={id}
                    ruleParams={params}
                    ruleInterval={schedule.interval}
                    ruleThrottle={''}
                    alertNotifyWhen={notifyWhen || 'onActionGroupChange'}
                    errors={errors || {}}
                    setRuleParams={onSetRuleParams}
                    setRuleProperty={onSetRuleProperty}
                    defaultActionGroupId={selectedRuleType.defaultActionGroupId}
                    actionGroups={selectedRuleType.actionGroups}
                    metadata={metadata}
                    charts={charts}
                    data={data}
                    dataViews={dataViews}
                    unifiedSearch={unifiedSearch}
                    onChangeMetaData={onChangeMetaData}
                  />
                </EuiErrorBoundary>
              </EuiFlexItem>
            </EuiFlexGroup>
          </Suspense>
        )}
      </EuiSplitPanel.Inner>
      <EuiSplitPanel.Inner>
        <EuiDescribedFormGroup
          fullWidth
          title={<h3>{SCHEDULE_TITLE}</h3>}
          description={
            <EuiText size="s">
              <p>
                {SCHEDULE_DESCRIPTION_TEXT}&nbsp;
                <EuiIconTip
                  position="right"
                  type="questionInCircle"
                  content={SCHEDULE_TOOLTIP_TEXT}
                />
              </p>
            </EuiText>
          }
        >
          <RuleSchedule />
        </EuiDescribedFormGroup>
        {shouldShowConsumerSelect && (
          <EuiDescribedFormGroup
            fullWidth
            title={<h3>{SCOPE_TITLE}</h3>}
            description={
              <EuiText size="s">
                <p>{SCOPE_DESCRIPTION_TEXT}</p>
              </EuiText>
            }
          >
            <RuleConsumerSelection consumers={authorizedConsumers} />
          </EuiDescribedFormGroup>
        )}
        <EuiFlexItem>
          <EuiAccordion
            id="advancedOptionsAccordion"
            data-test-subj="advancedOptionsAccordion"
            onToggle={onToggleAdvancedOptions}
            initialIsOpen={isAdvancedOptionsVisible}
            buttonContent={
              <EuiText size="s">
                <p>{ADVANCED_OPTIONS_TITLE}</p>
              </EuiText>
            }
          >
            <EuiSpacer size="s" />
            <EuiPanel hasShadow={false} hasBorder color="subdued">
              <EuiDescribedFormGroup
                fullWidth
                title={<h4>{ALERT_DELAY_TITLE}</h4>}
                description={
                  <EuiText size="s">
                    <p>{ALERT_DELAY_DESCRIPTION_TEXT}</p>
                  </EuiText>
                }
              >
                <RuleAlertDelay />
              </EuiDescribedFormGroup>
            </EuiPanel>
          </EuiAccordion>
        </EuiFlexItem>
      </EuiSplitPanel.Inner>
    </EuiSplitPanel.Outer>
  );
};
