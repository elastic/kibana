/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  COLOR_MODES_STANDARD,
  EuiAccordion,
  EuiDescribedFormGroup,
  EuiEmptyPrompt,
  EuiErrorBoundary,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIconTip,
  EuiLink,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSpacer,
  EuiSplitPanel,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { RuleSpecificFlappingProperties } from '@kbn/alerting-types';
import {
  RuleSettingsFlappingForm,
  RuleSettingsFlappingTitleTooltip,
} from '@kbn/alerts-ui-shared/lib';
import { EuiThemeProvider } from '@kbn/kibana-react-plugin/common';
import React, { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { ALERTING_FEATURE_ID, MULTI_CONSUMER_RULE_TYPE_IDS } from '../constants';
import { IS_RULE_SPECIFIC_FLAPPING_ENABLED } from '../constants/rule_flapping';
import { useRuleFormDispatch, useRuleFormState } from '../hooks';
import {
  ADVANCED_OPTIONS_TITLE,
  ALERT_DELAY_DESCRIPTION_TEXT,
  ALERT_DELAY_HELP_TEXT,
  ALERT_DELAY_TITLE,
  ALERT_FLAPPING_DETECTION_DESCRIPTION,
  FEATURE_NAME_MAP,
  ALERT_FLAPPING_DETECTION_TITLE,
  DOC_LINK_TITLE,
  LOADING_RULE_TYPE_PARAMS_TITLE,
  SCHEDULE_DESCRIPTION_TEXT,
  SCHEDULE_TITLE,
  SCHEDULE_TOOLTIP_TEXT,
  SCOPE_DESCRIPTION_TEXT,
  SCOPE_TITLE,
} from '../translations';
import { getAuthorizedConsumers } from '../utils';
import { RuleAlertDelay } from './rule_alert_delay';
import { RuleConsumerSelection } from './rule_consumer_selection';
import { RuleSchedule } from './rule_schedule';

export const RuleDefinition = () => {
  const {
    id,
    formData,
    plugins,
    paramsErrors,
    metadata,
    selectedRuleType,
    selectedRuleTypeModel,
    availableRuleTypes,
    validConsumers,
    canShowConsumerSelection = false,
    flappingSettings,
  } = useRuleFormState();

  const { colorMode } = useEuiTheme();
  const dispatch = useRuleFormDispatch();

  useEffect(() => {
    // Need to do a dry run validating the params because the Missing Monitor Data rule type
    // does not properly initialize the params
    if (selectedRuleType.id === 'monitoring_alert_missing_monitoring_data') {
      dispatch({ type: 'runValidation' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { charts, data, dataViews, unifiedSearch, docLinks, application } = plugins;

  const {
    capabilities: { rulesSettings },
  } = application;

  const { readFlappingSettingsUI, writeFlappingSettingsUI } = rulesSettings || {};

  const { params, schedule, notifyWhen, flapping, consumer, ruleTypeId } = formData;

  const [isAdvancedOptionsVisible, setIsAdvancedOptionsVisible] = useState<boolean>(false);

  const [isFlappingPopoverOpen, setIsFlappingPopoverOpen] = useState<boolean>(false);

  const authorizedConsumers = useMemo(() => {
    if (consumer !== ALERTING_FEATURE_ID) {
      return [];
    }
    const selectedAvailableRuleType = availableRuleTypes.find((ruleType) => {
      return ruleType.id === selectedRuleType.id;
    });
    if (!selectedAvailableRuleType?.authorizedConsumers) {
      return [];
    }
    return getAuthorizedConsumers({
      ruleType: selectedAvailableRuleType,
      validConsumers,
    });
  }, [consumer, selectedRuleType, availableRuleTypes, validConsumers]);

  const shouldShowConsumerSelect = useMemo(() => {
    if (!canShowConsumerSelection) {
      return false;
    }

    /*
     * This will filter out values like 'alerts' and 'observability' that will not be displayed
     * in the drop down. It will allow us to hide the consumer select when there is only one
     * selectable value.
     */
    const authorizedValidConsumers = authorizedConsumers.filter((c) => c in FEATURE_NAME_MAP);

    if (authorizedValidConsumers.length <= 1) {
      return false;
    }

    return !!(ruleTypeId && MULTI_CONSUMER_RULE_TYPE_IDS.includes(ruleTypeId));
  }, [ruleTypeId, authorizedConsumers, canShowConsumerSelection]);

  const RuleParamsExpressionComponent = selectedRuleTypeModel.ruleParamsExpression ?? null;

  const docsUrl = useMemo(() => {
    const { documentationUrl } = selectedRuleTypeModel;
    if (typeof documentationUrl === 'function') {
      return documentationUrl(docLinks);
    }
    return documentationUrl;
  }, [selectedRuleTypeModel, docLinks]);

  const onChangeMetaData = useCallback(
    (newMetadata: Record<string, unknown>) => {
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

  const onSetFlapping = useCallback(
    (value: RuleSpecificFlappingProperties | null) => {
      dispatch({
        type: 'setRuleProperty',
        payload: {
          property: 'flapping',
          value,
        },
      });
    },
    [dispatch]
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
                  <EuiThemeProvider darkMode={colorMode === COLOR_MODES_STANDARD.dark}>
                    <RuleParamsExpressionComponent
                      id={id}
                      ruleParams={params}
                      ruleInterval={schedule.interval}
                      ruleThrottle={''}
                      alertNotifyWhen={notifyWhen || 'onActionGroupChange'}
                      errors={paramsErrors || {}}
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
                  </EuiThemeProvider>
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
            description={<p>{SCOPE_DESCRIPTION_TEXT}</p>}
          >
            <RuleConsumerSelection validConsumers={authorizedConsumers} />
          </EuiDescribedFormGroup>
        )}
        <EuiFlexItem>
          <EuiAccordion
            id="advancedOptionsAccordion"
            data-test-subj="advancedOptionsAccordion"
            onToggle={(isOpen) => {
              setIsAdvancedOptionsVisible(isOpen);
              setIsFlappingPopoverOpen(false);
            }}
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
                <RuleAlertDelay />
              </EuiDescribedFormGroup>
              {IS_RULE_SPECIFIC_FLAPPING_ENABLED && readFlappingSettingsUI && (
                <EuiDescribedFormGroup
                  data-test-subj="ruleDefinitionFlappingFormGroup"
                  fullWidth
                  title={<h4>{ALERT_FLAPPING_DETECTION_TITLE}</h4>}
                  description={
                    <EuiText size="s">
                      <p>
                        {ALERT_FLAPPING_DETECTION_DESCRIPTION}
                        <RuleSettingsFlappingTitleTooltip
                          isOpen={isFlappingPopoverOpen}
                          setIsPopoverOpen={setIsFlappingPopoverOpen}
                          anchorPosition="downCenter"
                        />
                      </p>
                    </EuiText>
                  }
                >
                  <RuleSettingsFlappingForm
                    flappingSettings={flapping}
                    spaceFlappingSettings={flappingSettings}
                    canWriteFlappingSettingsUI={!!writeFlappingSettingsUI}
                    onFlappingChange={onSetFlapping}
                  />
                </EuiDescribedFormGroup>
              )}
            </EuiPanel>
          </EuiAccordion>
        </EuiFlexItem>
      </EuiSplitPanel.Inner>
    </EuiSplitPanel.Outer>
  );
};
