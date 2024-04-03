/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useMemo, useCallback } from 'react';
import { EuiComboBox, EuiFormRow, EuiComboBoxOptionOption } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { AlertConsumers, RuleCreationValidConsumer } from '@kbn/rule-data-utils';
import { IErrorObject } from '../../types';
import { useRuleFormSelector, useRuleFormDispatch } from '../../hooks';
import { setConsumer } from './slice';

const SELECT_LABEL: string = i18n.translate(
  'alertsUIShared.ruleForm.ruleDefinition.ruleFormConsumerSelection.selectLabel',
  {
    defaultMessage: 'Role visibility',
  }
);

const featureNameMap: Record<string, string> = {
  [AlertConsumers.LOGS]: i18n.translate(
    'alertsUIShared.ruleForm.ruleDefinition.ruleFormConsumerSelection.logs',
    {
      defaultMessage: 'Logs',
    }
  ),
  [AlertConsumers.INFRASTRUCTURE]: i18n.translate(
    'alertsUIShared.ruleForm.ruleDefinition.ruleFormConsumerSelection.infrastructure',
    {
      defaultMessage: 'Metrics',
    }
  ),
  [AlertConsumers.APM]: i18n.translate(
    'alertsUIShared.ruleForm.ruleDefinition.ruleFormConsumerSelection.apm',
    {
      defaultMessage: 'APM and User Experience',
    }
  ),
  [AlertConsumers.UPTIME]: i18n.translate(
    'alertsUIShared.ruleForm.ruleDefinition.ruleFormConsumerSelection.uptime',
    {
      defaultMessage: 'Synthetics and Uptime',
    }
  ),
  [AlertConsumers.SLO]: i18n.translate(
    'alertsUIShared.ruleForm.ruleDefinition.ruleFormConsumerSelection.slo',
    {
      defaultMessage: 'SLOs',
    }
  ),
  stackAlerts: i18n.translate(
    'alertsUIShared.ruleForm.ruleDefinition.ruleFormConsumerSelection.stackAlerts',
    {
      defaultMessage: 'Stack Rules',
    }
  ),
};

export const VALID_CONSUMERS: RuleCreationValidConsumer[] = [
  AlertConsumers.LOGS,
  AlertConsumers.INFRASTRUCTURE,
  'stackAlerts',
  'alerts',
];

export interface RuleFormConsumerSelectionProps {
  validConsumers: RuleCreationValidConsumer[];
  errors?: IErrorObject;
}

const SINGLE_SELECTION = { asPlainText: true };

export const RuleFormConsumerSelection = (props: RuleFormConsumerSelectionProps) => {
  const { validConsumers, errors } = props;
  const selectedConsumer = useRuleFormSelector((state) => state.ruleDefinition.consumer);
  const dispatch = useRuleFormDispatch();

  const isInvalid: IErrorObject = (errors?.consumer?.length ?? 0) > 0;
  const handleOnChange = useCallback(
    (selected: Array<EuiComboBoxOptionOption<RuleCreationValidConsumer>>) => {
      if (selected.length > 0) {
        const newSelectedConsumer = selected[0];
        dispatch(setConsumer(newSelectedConsumer.value!));
      } else {
        dispatch(setConsumer(null));
      }
    },
    [dispatch]
  );
  const validatedSelectedConsumer = useMemo(() => {
    if (
      selectedConsumer &&
      validConsumers.includes(selectedConsumer) &&
      featureNameMap[selectedConsumer]
    ) {
      return selectedConsumer;
    }
    return null;
  }, [selectedConsumer, validConsumers]);
  const selectedOptions = useMemo(
    () =>
      validatedSelectedConsumer
        ? [{ value: validatedSelectedConsumer, label: featureNameMap[validatedSelectedConsumer] }]
        : [],
    [validatedSelectedConsumer]
  );

  const formattedSelectOptions: Array<EuiComboBoxOptionOption<RuleCreationValidConsumer>> =
    useMemo(() => {
      return validConsumers
        .reduce<Array<EuiComboBoxOptionOption<RuleCreationValidConsumer>>>((result, consumer) => {
          if (featureNameMap[consumer]) {
            result.push({
              value: consumer,
              'data-test-subj': consumer,
              label: featureNameMap[consumer],
            });
          }
          return result;
        }, [])
        .sort((a, b) => {
          return a.value!.localeCompare(b.value!);
        });
    }, [validConsumers]);

  if (validConsumers.length <= 1 || validConsumers.includes(AlertConsumers.OBSERVABILITY)) {
    return null;
  }
  return (
    <EuiFormRow fullWidth label={SELECT_LABEL} isInvalid={isInvalid} error={errors?.consumer ?? ''}>
      <EuiComboBox
        data-test-subj="ruleFormConsumerSelect"
        aria-label={i18n.translate(
          'alertsUIShared.ruleForm.ruleDefinition.ruleFormConsumerSelection.comboBox.ariaLabel',
          {
            defaultMessage: 'Select a scope',
          }
        )}
        placeholder={i18n.translate(
          'alertsUIShared.ruleForm.ruleDefinition.ruleFormConsumerSelection.comboBox.placeholder',
          {
            defaultMessage: 'Select a scope',
          }
        )}
        fullWidth
        singleSelection={SINGLE_SELECTION}
        options={formattedSelectOptions}
        selectedOptions={selectedOptions}
        onChange={handleOnChange}
      />
    </EuiFormRow>
  );
};
