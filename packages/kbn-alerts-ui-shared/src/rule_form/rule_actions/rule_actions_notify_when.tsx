/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { css } from '@emotion/css'; // We can't use @emotion/react - this component gets used with plugins that use both styled-components and Emotion
import { i18n } from '@kbn/i18n';
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
import { RuleNotifyWhenType, RuleNotifyWhen } from '@kbn/alerting-types';
import { DEFAULT_FREQUENCY } from '../constants';
import { getTimeOptions } from '../utils';
import { RuleAction } from '../../common';

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
      inputDisplay: i18n.translate('alertsUIShared.ruleForm.onActionGroupChange.display', {
        defaultMessage: 'On status changes',
      }),
      'data-test-subj': 'onActionGroupChange',
      dropdownDisplay: (
        <>
          <strong>
            <FormattedMessage
              defaultMessage="On status changes"
              id="alertsUIShared.ruleForm.onActionGroupChange.label"
            />
          </strong>
          <EuiText size="s" color="subdued">
            <p>
              <FormattedMessage
                defaultMessage="Actions run if the alert status changes."
                id="alertsUIShared.ruleForm.onActionGroupChange.description"
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
      inputDisplay: i18n.translate('alertsUIShared.ruleForm.onActiveAlert.display', {
        defaultMessage: 'On check intervals',
      }),
      'data-test-subj': 'onActiveAlert',
      dropdownDisplay: (
        <>
          <strong>
            <FormattedMessage
              defaultMessage="On check intervals"
              id="alertsUIShared.ruleForm.onActiveAlert.label"
            />
          </strong>
          <EuiText size="s" color="subdued">
            <p>
              <FormattedMessage
                defaultMessage="Actions run if rule conditions are met."
                id="alertsUIShared.ruleForm.onActiveAlert.description"
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
      inputDisplay: i18n.translate('alertsUIShared.ruleForm.onThrottleInterval.display', {
        defaultMessage: 'On custom action intervals',
      }),
      'data-test-subj': 'onThrottleInterval',
      dropdownDisplay: (
        <>
          <strong>
            <FormattedMessage
              defaultMessage="On custom action intervals"
              id="alertsUIShared.ruleForm.onThrottleInterval.label"
            />
          </strong>
          <EuiText size="s" color="subdued">
            <p>
              <FormattedMessage
                defaultMessage="Actions run if rule conditions are met."
                id="alertsUIShared.ruleForm.onThrottleInterval.description"
              />
            </p>
          </EuiText>
        </>
      ),
    },
  },
];

interface RuleActionsNotifyWhenProps {
  frequency: RuleAction['frequency'];
  throttle: number | null;
  throttleUnit: string;
  onNotifyWhenChange: (notifyWhen: RuleNotifyWhenType) => void;
  onThrottleChange: (throttle: number | null, throttleUnit: string) => void;
  onSummaryChange: (summary: boolean) => void;
  hasAlertsMappings?: boolean;
  showMinimumThrottleWarning?: boolean;
  showMinimumThrottleUnitWarning?: boolean;
  notifyWhenSelectOptions?: NotifyWhenSelectOptions[];
  defaultNotifyWhenValue?: RuleNotifyWhenType;
}

export const RuleActionsNotifyWhen = ({
  hasAlertsMappings,
  frequency = DEFAULT_FREQUENCY,
  throttle,
  throttleUnit,
  onNotifyWhenChange,
  onThrottleChange,
  onSummaryChange,
  showMinimumThrottleWarning,
  showMinimumThrottleUnitWarning,
  notifyWhenSelectOptions = NOTIFY_WHEN_OPTIONS,
  defaultNotifyWhenValue = DEFAULT_FREQUENCY.notifyWhen,
}: RuleActionsNotifyWhenProps) => {
  const [showCustomThrottleOpts, setShowCustomThrottleOpts] = useState<boolean>(false);
  const [notifyWhenValue, setNotifyWhenValue] =
    useState<RuleNotifyWhenType>(defaultNotifyWhenValue);

  const [summaryMenuOpen, setSummaryMenuOpen] = useState(false);

  useEffect(() => {
    if (frequency.notifyWhen) {
      setNotifyWhenValue(frequency.notifyWhen);
    } else {
      // If 'notifyWhen' is not set, derive value from existence of throttle value
      setNotifyWhenValue(frequency.throttle ? RuleNotifyWhen.THROTTLE : RuleNotifyWhen.ACTIVE);
    }
  }, [frequency]);

  useEffect(() => {
    setShowCustomThrottleOpts(notifyWhenValue === RuleNotifyWhen.THROTTLE);
  }, [notifyWhenValue]);

  const onNotifyWhenValueChange = useCallback(
    (newValue: RuleNotifyWhenType) => {
      onNotifyWhenChange(newValue);
      setNotifyWhenValue(newValue);
      // Calling onNotifyWhenChange and onThrottleChange at the same time interferes with the React state lifecycle
      // so wait for onNotifyWhenChange to process before calling onThrottleChange
      setTimeout(
        () =>
          onThrottleChange(
            newValue === RuleNotifyWhen.THROTTLE ? throttle ?? 1 : null,
            throttleUnit
          ),
        100
      );
    },
    [onNotifyWhenChange, onThrottleChange, throttle, throttleUnit]
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
      onSummaryChange(summary);
      setSummaryMenuOpen(false);
      if (selectedOptionDoesNotExist(summary)) {
        onNotifyWhenChange(getDefaultNotifyWhenOption(summary));
      }
    },
    [onSummaryChange, selectedOptionDoesNotExist, onNotifyWhenChange, getDefaultNotifyWhenOption]
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
        'alertsUIShared.ruleActionsNotifyWhen.summaryOrRulePerSelectRoleDescription',
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
      label={i18n.translate('alertsUIShared.ruleActionsNotifyWhen.actionFrequencyLabel', {
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
            valueOfSelected={notifyWhenValue}
            onChange={onNotifyWhenValueChange}
          />
          {showCustomThrottleOpts && (
            <>
              <EuiSpacer size="s" />
              <EuiFormRow fullWidth>
                <EuiFlexGroup gutterSize="s">
                  <EuiFlexItem style={{ flexGrow: 0.1 }} />
                  <EuiFlexItem grow={2}>
                    <EuiFieldNumber
                      isInvalid={showMinimumThrottleWarning}
                      min={1}
                      value={throttle ?? 1}
                      name="throttle"
                      data-test-subj="throttleInput"
                      prepend={i18n.translate(
                        'alertsUIShared.ruleActionsNotifyWhen.frequencyNotifyWhen.label',
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
                            onThrottleChange(value, throttleUnit);
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
                        onThrottleChange(throttle, e.target.value);
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
                      'alertsUIShared.ruleActionsNotifyWhen.notifyWhenThrottleWarning',
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

const FOR_EACH_ALERT = i18n.translate('alertsUIShared.ruleActionsNotifyWhen.forEachOption', {
  defaultMessage: 'For each alert',
});
const SUMMARY_OF_ALERTS = i18n.translate('alertsUIShared.ruleActionsNotifyWhen.summaryOption', {
  defaultMessage: 'Summary of alerts',
});
