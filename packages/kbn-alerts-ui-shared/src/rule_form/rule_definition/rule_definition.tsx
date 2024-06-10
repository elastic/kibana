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
  EuiAccordion,
  EuiPanel,
  EuiSpacer,
  EuiErrorBoundary,
  EuiIconTip,
} from '@elastic/eui';
import {
  RuleCreationValidConsumer,
  ES_QUERY_ID,
  OBSERVABILITY_THRESHOLD_RULE_TYPE_ID,
  ML_ANOMALY_DETECTION_RULE_TYPE_ID,
} from '@kbn/rule-data-utils';
import type { ChartsPluginSetup } from '@kbn/charts-plugin/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';
import type { DocLinksStart } from '@kbn/core-doc-links-browser';
import type { SanitizedRule, RuleTypeParams } from '@kbn/alerting-types';
import type { RuleType } from '@kbn/triggers-actions-ui-types';
import type { RuleTypeModel, RuleFormErrors, MinimumScheduleInterval } from '../types';
import {
  DOC_LINK_TITLE,
  LOADING_RULE_TYPE_PARAMS_TITLE,
  SCHEDULE_TITLE,
  SCHEDULE_DESCRIPTION_TEXT,
  ALERT_DELAY_TITLE,
  SCOPE_TITLE,
  SCOPE_DESCRIPTION_TEXT,
  ADVANCED_OPTIONS_TITLE,
  ALERT_DELAY_DESCRIPTION_TEXT,
  SCHEDULE_TOOLTIP_TEXT,
  ALERT_DELAY_HELP_TEXT,
} from '../translations';
import { RuleAlertDelay } from './rule_alert_delay';
import { RuleConsumerSelection } from './rule_consumer_selection';
import { RuleSchedule } from './rule_schedule';

const MULTI_CONSUMER_RULE_TYPE_IDS = [
  OBSERVABILITY_THRESHOLD_RULE_TYPE_ID,
  ES_QUERY_ID,
  ML_ANOMALY_DETECTION_RULE_TYPE_ID,
];

interface RuleDefinitionProps {
  requiredPlugins: {
    charts: ChartsPluginSetup;
    data: DataPublicPluginStart;
    dataViews: DataViewsPublicPluginStart;
    unifiedSearch: UnifiedSearchPublicPluginStart;
    docLinks: DocLinksStart;
  };
  formValues: {
    id?: SanitizedRule<RuleTypeParams>['id'];
    params: SanitizedRule<RuleTypeParams>['params'];
    schedule: SanitizedRule<RuleTypeParams>['schedule'];
    alertDelay?: SanitizedRule<RuleTypeParams>['alertDelay'];
    notifyWhen?: SanitizedRule<RuleTypeParams>['notifyWhen'];
    consumer?: SanitizedRule<RuleTypeParams>['consumer'];
  };
  minimumScheduleInterval?: MinimumScheduleInterval;
  errors?: RuleFormErrors;
  canShowConsumerSelection?: boolean;
  authorizedConsumers?: RuleCreationValidConsumer[];
  selectedRuleTypeModel: RuleTypeModel;
  selectedRuleType: RuleType;
  validConsumers?: RuleCreationValidConsumer[];
  onChange: (property: string, value: unknown) => void;
}

export const RuleDefinition = (props: RuleDefinitionProps) => {
  const {
    requiredPlugins,
    formValues,
    errors = {},
    canShowConsumerSelection = false,
    authorizedConsumers = [],
    selectedRuleTypeModel,
    selectedRuleType,
    minimumScheduleInterval,
    onChange,
  } = props;

  const { charts, data, dataViews, unifiedSearch, docLinks } = requiredPlugins;

  const { id, params, schedule, alertDelay, notifyWhen, consumer = 'alerts' } = formValues;

  const [metadata, setMetadata] = useState<Record<string, unknown>>();
  const [isAdvancedOptionsVisible, setIsAdvancedOptionsVisible] = useState<boolean>(false);

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

  const onSetRuleParams = useCallback(
    (property: string, value: unknown) => {
      onChange('params', {
        ...params,
        [property]: value,
      });
    },
    [onChange, params]
  );

  const onSetRule = useCallback(
    (property: string, value: unknown) => {
      onChange(property, value);
    },
    [onChange]
  );

  return (
    <EuiSplitPanel.Outer hasBorder hasShadow={false} data-test-subj="ruleDefinition">
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
                    errors={errors}
                    setRuleParams={onSetRuleParams}
                    setRuleProperty={onSetRule}
                    defaultActionGroupId={selectedRuleType.defaultActionGroupId}
                    actionGroups={selectedRuleType.actionGroups}
                    metadata={metadata}
                    charts={charts}
                    data={data}
                    dataViews={dataViews}
                    unifiedSearch={unifiedSearch}
                    onChangeMetaData={setMetadata}
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
          <RuleSchedule
            interval={schedule.interval}
            minimumScheduleInterval={minimumScheduleInterval}
            errors={errors}
            onChange={onChange}
          />
        </EuiDescribedFormGroup>
        {shouldShowConsumerSelect && (
          <EuiDescribedFormGroup
            fullWidth
            title={<h3>{SCOPE_TITLE}</h3>}
            description={<p>{SCOPE_DESCRIPTION_TEXT}</p>}
          >
            <RuleConsumerSelection
              consumers={authorizedConsumers}
              selectedConsumer={consumer as RuleCreationValidConsumer}
              errors={errors}
              onChange={onChange}
            />
          </EuiDescribedFormGroup>
        )}
        <EuiFlexItem>
          <EuiAccordion
            id="advancedOptionsAccordion"
            data-test-subj="advancedOptionsAccordion"
            onToggle={setIsAdvancedOptionsVisible}
            initialIsOpen={isAdvancedOptionsVisible}
            buttonProps={{
              'data-test-subj': 'advancedOptionsAccordionButton',
            }}
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
                    <p>
                      {ALERT_DELAY_DESCRIPTION_TEXT}&nbsp;
                      <EuiIconTip
                        position="right"
                        type="questionInCircle"
                        content={ALERT_DELAY_HELP_TEXT}
                      />
                    </p>
                  </EuiText>
                }
              >
                <RuleAlertDelay alertDelay={alertDelay} errors={errors} onChange={onChange} />
              </EuiDescribedFormGroup>
            </EuiPanel>
          </EuiAccordion>
        </EuiFlexItem>
      </EuiSplitPanel.Inner>
    </EuiSplitPanel.Outer>
  );
};
