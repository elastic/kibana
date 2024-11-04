/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState, useCallback, useMemo } from 'react';
import { css } from '@emotion/css'; // We can't use @emotion/react - this component gets used with plugins that use both styled-components and Emotion
import { i18n } from '@kbn/i18n';
import {
  RuleNotifyWhenType,
  RuleNotifyWhen,
  RuleAction,
  RuleActionFrequency,
} from '@kbn/alerting-types';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiFieldNumber,
  EuiSelect,
  EuiText,
  EuiSpacer,
  EuiSuperSelect,
  EuiPopover,
  EuiButtonEmpty,
  EuiContextMenuPanel,
  EuiContextMenuItem,
  useEuiTheme,
  EuiSuperSelectOption,
} from '@elastic/eui';
import { some, filter, map } from 'fp-ts/lib/Option';
import { pipe } from 'fp-ts/lib/pipeable';
import { DEFAULT_FREQUENCY } from '../constants';
import { getTimeOptions } from '../utils';

const FOR_EACH_ALERT = i18n.translate('responseOpsRuleForm.actiActionsonNotifyWhen.forEachOption', {
  defaultMessage: 'For each alert',
});
const SUMMARY_OF_ALERTS = i18n.translate(
  'responseOpsRuleForm.actiActionsonNotifyWhen.summaryOption',
  {
    defaultMessage: 'Summary of alerts',
  }
);

export interface NotifyWhenSelectOptions {
  isSummaryOption?: boolean;
  isForEachAlertOption?: boolean;
  value: EuiSuperSelectOption<RuleNotifyWhenType>;
}

export const NOTIFY_WHEN_OPTIONS: NotifyWhenSelectOptions[] = [
  {
    isSummaryOption: false,
    isForEachAlertOption: true,
    value: {
      value: 'onActionGroupChange',
      inputDisplay: i18n.translate(
        'responseOpsRuleForm.ruleActionsNotifyWhen.onActionGroupChange.display',
        {
          defaultMessage: 'On status changes',
        }
      ),
      'data-test-subj': 'onActionGroupChange',
      dropdownDisplay: (
        <>
          <strong>
            <FormattedMessage
              defaultMessage="On status changes"
              id="responseOpsRuleForm.ruleActionsNotifyWhen.onActionGroupChange.label"
            />
          </strong>
          <EuiText size="s" color="subdued">
            <p>
              <FormattedMessage
                defaultMessage="Actions run if the alert status changes."
                id="responseOpsRuleForm.ruleActionsNotifyWhen.onActionGroupChange.description"
              />
            </p>
          </EuiText>
        </>
      ),
    },
  },
  {
    isSummaryOption: true,
    isForEachAlertOption: true,
    value: {
      value: 'onActiveAlert',
      inputDisplay: i18n.translate(
        'responseOpsRuleForm.ruleActionsNotifyWhen.onActiveAlert.display',
        {
          defaultMessage: 'On check intervals',
        }
      ),
      'data-test-subj': 'onActiveAlert',
      dropdownDisplay: (
        <>
          <strong>
            <FormattedMessage
              defaultMessage="On check intervals"
              id="responseOpsRuleForm.ruleActionsNotifyWhen.onActiveAlert.label"
            />
          </strong>
          <EuiText size="s" color="subdued">
            <p>
              <FormattedMessage
                defaultMessage="Actions run if rule conditions are met."
                id="responseOpsRuleForm.ruleActionsNotifyWhen.onActiveAlert.description"
              />
            </p>
          </EuiText>
        </>
      ),
    },
  },
  {
    isSummaryOption: true,
    isForEachAlertOption: true,
    value: {
      value: 'onThrottleInterval',
      inputDisplay: i18n.translate(
        'responseOpsRuleForm.ruleActionsNotifyWhen.onThrottleInterval.display',
        {
          defaultMessage: 'On custom action intervals',
        }
      ),
      'data-test-subj': 'onThrottleInterval',
      dropdownDisplay: (
        <>
          <strong>
            <FormattedMessage
              defaultMessage="On custom action intervals"
              id="responseOpsRuleForm.ruleActionsNotifyWhen.onThrottleInterval.label"
            />
          </strong>
          <EuiText size="s" color="subdued">
            <p>
              <FormattedMessage
                defaultMessage="Actions run if rule conditions are met."
                id="responseOpsRuleForm.ruleActionsNotifyWhen.onThrottleInterval.description"
              />
            </p>
          </EuiText>
        </>
      ),
    },
  },
];

export interface RuleActionsNotifyWhenProps {
  frequency: RuleAction['frequency'];
  throttle: number | null;
  throttleUnit: string;
  hasAlertsMappings?: boolean;
  showMinimumThrottleWarning?: boolean;
  showMinimumThrottleUnitWarning?: boolean;
  notifyWhenSelectOptions?: NotifyWhenSelectOptions[];
  onChange: (frequency: RuleActionFrequency) => void;
  onUseDefaultMessage: () => void;
}

export const RuleActionsNotifyWhen = ({
  hasAlertsMappings,
  frequency = DEFAULT_FREQUENCY,
  throttle,
  throttleUnit,
  showMinimumThrottleWarning,
  showMinimumThrottleUnitWarning,
  notifyWhenSelectOptions = NOTIFY_WHEN_OPTIONS,
  onChange,
  onUseDefaultMessage,
}: RuleActionsNotifyWhenProps) => {
  const [summaryMenuOpen, setSummaryMenuOpen] = useState(false);

  const showCustomThrottleOpts = frequency?.notifyWhen === RuleNotifyWhen.THROTTLE;

  const onNotifyWhenValueChange = useCallback(
    (newValue: RuleNotifyWhenType) => {
      const newThrottle = newValue === RuleNotifyWhen.THROTTLE ? throttle ?? 1 : null;
      onChange({
        ...frequency,
        notifyWhen: newValue,
        throttle: newThrottle ? `${newThrottle}${throttleUnit}` : null,
      });
    },
    [onChange, throttle, throttleUnit, frequency]
  );

  const summaryNotifyWhenOptions = useMemo(
    () => notifyWhenSelectOptions.filter((o) => o.isSummaryOption).map((o) => o.value),
    [notifyWhenSelectOptions]
  );

  const forEachAlertNotifyWhenOptions = useMemo(
    () => notifyWhenSelectOptions.filter((o) => o.isForEachAlertOption).map((o) => o.value),
    [notifyWhenSelectOptions]
  );

  const notifyWhenOptions = useMemo(
    () => (frequency.summary ? summaryNotifyWhenOptions : forEachAlertNotifyWhenOptions),
    [forEachAlertNotifyWhenOptions, frequency.summary, summaryNotifyWhenOptions]
  );

  const selectedOptionDoesNotExist = useCallback(
    (summary: boolean) =>
      (summary &&
        !summaryNotifyWhenOptions.filter((o) => o.value === frequency.notifyWhen).length) ||
      (!summary &&
        !forEachAlertNotifyWhenOptions.filter((o) => o.value === frequency.notifyWhen).length),
    [forEachAlertNotifyWhenOptions, frequency.notifyWhen, summaryNotifyWhenOptions]
  );

  const getDefaultNotifyWhenOption = useCallback(
    (summary: boolean) => {
      if (summary) {
        return summaryNotifyWhenOptions.length
          ? summaryNotifyWhenOptions[0].value
          : RuleNotifyWhen.ACTIVE;
      }
      return forEachAlertNotifyWhenOptions.length
        ? forEachAlertNotifyWhenOptions[0].value
        : RuleNotifyWhen.ACTIVE;
    },
    [forEachAlertNotifyWhenOptions, summaryNotifyWhenOptions]
  );

  const selectSummaryOption = useCallback(
    (summary: boolean) => {
      onChange({
        summary,
        notifyWhen: selectedOptionDoesNotExist(summary)
          ? getDefaultNotifyWhenOption(summary)
          : frequency.notifyWhen,
        throttle: frequency.throttle,
      });
      onUseDefaultMessage();
      setSummaryMenuOpen(false);
    },
    [
      frequency,
      onUseDefaultMessage,
      selectedOptionDoesNotExist,
      getDefaultNotifyWhenOption,
      onChange,
    ]
  );

  const { euiTheme } = useEuiTheme();
  const summaryContextMenuOptionStyles = useMemo(
    () => css`
      min-width: 300px;
      padding: ${euiTheme.size.s};
    `,
    [euiTheme]
  );

  const summaryOptions = useMemo(
    () => [
      <EuiContextMenuItem
        key="summary"
        onClick={() => selectSummaryOption(true)}
        icon={frequency.summary ? 'check' : 'empty'}
        id="actionNotifyWhen-option-summary"
        data-test-subj="actionNotifyWhen-option-summary"
        className={summaryContextMenuOptionStyles}
      >
        {SUMMARY_OF_ALERTS}
      </EuiContextMenuItem>,
      <EuiContextMenuItem
        key="for_each"
        onClick={() => selectSummaryOption(false)}
        icon={!frequency.summary ? 'check' : 'empty'}
        id="actionNotifyWhen-option-for_each"
        data-test-subj="actionNotifyWhen-option-for_each"
        className={summaryContextMenuOptionStyles}
      >
        {FOR_EACH_ALERT}
      </EuiContextMenuItem>,
    ],
    [frequency.summary, selectSummaryOption, summaryContextMenuOptionStyles]
  );

  const summaryOrPerRuleSelect = (
    <EuiPopover
      data-test-subj="summaryOrPerRuleSelect"
      initialFocus={`#actionNotifyWhen-option-${frequency.summary ? 'summary' : 'for_each'}`}
      isOpen={summaryMenuOpen}
      closePopover={useCallback(() => setSummaryMenuOpen(false), [setSummaryMenuOpen])}
      panelPaddingSize="none"
      anchorPosition="downLeft"
      aria-label={frequency.summary ? SUMMARY_OF_ALERTS : FOR_EACH_ALERT}
      aria-roledescription={i18n.translate(
        'responseOpsRuleForm.ruleActionsNotifyWhen.summaryOrRulePerSelectRoleDescription',
        { defaultMessage: 'Action frequency type select' }
      )}
      button={
        <EuiButtonEmpty
          size="xs"
          iconType="arrowDown"
          iconSide="right"
          onClick={useCallback(() => setSummaryMenuOpen(!summaryMenuOpen), [summaryMenuOpen])}
        >
          {frequency.summary ? SUMMARY_OF_ALERTS : FOR_EACH_ALERT}
        </EuiButtonEmpty>
      }
    >
      <EuiContextMenuPanel items={summaryOptions} />
    </EuiPopover>
  );

  return (
    <EuiFormRow
      fullWidth
      label={i18n.translate('responseOpsRuleForm.ruleActionsNotifyWhen.actionFrequencyLabel', {
        defaultMessage: 'Action frequency',
      })}
    >
      <EuiFlexGroup gutterSize="s">
        <EuiFlexItem>
          <EuiSuperSelect
            fullWidth
            prepend={hasAlertsMappings ? summaryOrPerRuleSelect : <></>}
            data-test-subj="notifyWhenSelect"
            options={notifyWhenOptions}
            valueOfSelected={frequency.notifyWhen}
            onChange={onNotifyWhenValueChange}
          />
          {showCustomThrottleOpts && (
            <>
              <EuiSpacer size="s" />
              <EuiFormRow fullWidth>
                <EuiFlexGroup gutterSize="s">
                  <EuiFlexItem grow={2}>
                    <EuiFieldNumber
                      isInvalid={showMinimumThrottleWarning}
                      min={1}
                      value={throttle ?? 1}
                      name="throttle"
                      data-test-subj="throttleInput"
                      prepend={i18n.translate(
                        'responseOpsRuleForm.ruleActionsNotifyWhen.frequencyNotifyWhen.label',
                        {
                          defaultMessage: 'Run every',
                        }
                      )}
                      onChange={(e) => {
                        pipe(
                          some(e.target.value.trim()),
                          filter((value) => value !== ''),
                          map((value) => parseInt(value, 10)),
                          filter((value) => !isNaN(value)),
                          map((value) => {
                            onChange({
                              ...frequency,
                              throttle: `${value}${throttleUnit}`,
                            });
                          })
                        );
                      }}
                    />
                  </EuiFlexItem>
                  <EuiFlexItem grow={3}>
                    <EuiSelect
                      isInvalid={showMinimumThrottleUnitWarning}
                      data-test-subj="throttleUnitInput"
                      value={throttleUnit}
                      options={getTimeOptions(throttle ?? 1)}
                      onChange={(e) => {
                        onChange({
                          ...frequency,
                          throttle: `${throttle}${e.target.value}`,
                        });
                      }}
                    />
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFormRow>
              {(showMinimumThrottleWarning || showMinimumThrottleUnitWarning) && (
                <>
                  <EuiSpacer size="xs" />
                  <EuiText size="xs" color="danger">
                    {i18n.translate(
                      'responseOpsRuleForm.ruleActionsNotifyWhen.notifyWhenThrottleWarning',
                      {
                        defaultMessage:
                          "Custom action intervals cannot be shorter than the rule's check interval",
                      }
                    )}
                  </EuiText>
                </>
              )}
            </>
          )}
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFormRow>
  );
};
