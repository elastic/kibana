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
import { getValidatedMultiConsumer } from '../utils';

export const VALID_CONSUMERS: RuleCreationValidConsumer[] = [
  AlertConsumers.LOGS,
  AlertConsumers.INFRASTRUCTURE,
  AlertConsumers.STACK_ALERTS,
  'alerts',
];

export interface RuleConsumerSelectionProps {
  validConsumers: RuleCreationValidConsumer[];
}

const SINGLE_SELECTION = { asPlainText: true };

type ComboBoxOption = EuiComboBoxOptionOption<RuleCreationValidConsumer>;

export const RuleConsumerSelection = (props: RuleConsumerSelectionProps) => {
  const { validConsumers } = props;
  const { multiConsumerSelection, baseErrors } = useRuleFormState();

  const dispatch = useRuleFormDispatch();

  const validatedSelectedConsumer = useMemo(() => {
    return getValidatedMultiConsumer({
      multiConsumerSelection,
      validConsumers,
    });
  }, [multiConsumerSelection, validConsumers]);

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
    return validConsumers
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
  }, [validConsumers]);

  const onConsumerChange = useCallback(
    (selected: ComboBoxOption[]) => {
      if (selected.length > 0) {
        const newSelectedConsumer = selected[0];
        dispatch({
          type: 'setMultiConsumer',
          payload: newSelectedConsumer.value!,
        });
      } else {
        dispatch({
          type: 'setMultiConsumer',
          payload: 'alerts',
        });
      }
    },
    [dispatch]
  );

  if (validConsumers.length <= 1 || validConsumers.includes(AlertConsumers.OBSERVABILITY)) {
    return null;
  }

  return (
    <EuiFormRow
      fullWidth
      label={CONSUMER_SELECT_TITLE}
      isInvalid={!!baseErrors?.consumer?.length}
      error={baseErrors?.consumer}
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
