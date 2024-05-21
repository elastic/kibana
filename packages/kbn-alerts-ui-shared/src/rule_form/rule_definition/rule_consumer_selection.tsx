/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useMemo, useCallback } from 'react';
import { EuiComboBox, EuiFormRow, EuiComboBoxOptionOption } from '@elastic/eui';
import { AlertConsumers, RuleCreationValidConsumer } from '@kbn/rule-data-utils';
import {
  CONSUMER_SELECT_TITLE,
  FEATURE_NAME_MAP,
  CONSUMER_SELECT_COMBO_BOX_TITLE,
} from '../translations';
import { useRuleFormState, useRuleFormDispatch } from '../hooks';

export const VALID_CONSUMERS: RuleCreationValidConsumer[] = [
  AlertConsumers.LOGS,
  AlertConsumers.INFRASTRUCTURE,
  AlertConsumers.STACK_ALERTS,
  'alerts',
];

export interface RuleConsumerSelectionProps {
  consumers: RuleCreationValidConsumer[];
  /* FUTURE ENGINEER
   * if this prop is set to null then we wont initialize the value and the user will have to set it
   * if this prop is set to a valid consumers then we will set it up to what was passed
   * if this prop is not valid or undefined but the valid consumers has stackAlerts then we will default it to stackAlerts
   */
  initialSelectedConsumer?: RuleCreationValidConsumer | null;
}

const SINGLE_SELECTION = { asPlainText: true };

type ComboBoxOption = EuiComboBoxOptionOption<RuleCreationValidConsumer>;

export const RuleConsumerSelection = (props: RuleConsumerSelectionProps) => {
  const { consumers } = props;

  const { formData, errors = {} } = useRuleFormState();

  const { consumer: selectedConsumer } = formData;

  const dispatch = useRuleFormDispatch();

  const isInvalid = (errors.consumer?.length || 0) > 0;

  const validatedSelectedConsumer = useMemo(() => {
    if (
      selectedConsumer &&
      consumers.includes(selectedConsumer as RuleCreationValidConsumer) &&
      FEATURE_NAME_MAP[selectedConsumer]
    ) {
      return selectedConsumer;
    }
    return null;
  }, [selectedConsumer, consumers]);

  const selectedOptions = useMemo(() => {
    if (validatedSelectedConsumer) {
      return [
        {
          value: validatedSelectedConsumer as RuleCreationValidConsumer,
          label: FEATURE_NAME_MAP[validatedSelectedConsumer],
        },
      ];
    }
    return [];
  }, [validatedSelectedConsumer]);

  const formattedSelectOptions = useMemo(() => {
    return consumers
      .reduce<ComboBoxOption[]>((result, consumer) => {
        if (FEATURE_NAME_MAP[consumer]) {
          result.push({
            value: consumer,
            'data-test-subj': `ruleConsumerSelectionOption-${consumer}`,
            label: FEATURE_NAME_MAP[consumer],
          });
        }
        return result;
      }, [])
      .sort((a, b) => a.value!.localeCompare(b.value!));
  }, [consumers]);

  const onConsumerChange = useCallback(
    (selected: ComboBoxOption[]) => {
      if (selected.length > 0) {
        const newSelectedConsumer = selected[0];
        dispatch({
          type: 'setConsumer',
          payload: newSelectedConsumer.value!,
        });
      } else {
        dispatch({
          type: 'setConsumer',
          payload: 'alerts',
        });
      }
    },
    [dispatch]
  );

  if (consumers.length <= 1 || consumers.includes(AlertConsumers.OBSERVABILITY)) {
    return null;
  }

  return (
    <EuiFormRow
      fullWidth
      label={CONSUMER_SELECT_TITLE}
      isInvalid={isInvalid}
      error={errors?.consumer ?? ''}
      data-test-subj="ruleConsumerSelection"
    >
      <EuiComboBox
        fullWidth
        data-test-subj="ruleConsumerSelectionInput"
        aria-label={CONSUMER_SELECT_COMBO_BOX_TITLE}
        placeholder={CONSUMER_SELECT_COMBO_BOX_TITLE}
        singleSelection={SINGLE_SELECTION}
        options={formattedSelectOptions}
        selectedOptions={selectedOptions}
        onChange={onConsumerChange}
      />
    </EuiFormRow>
  );
};
