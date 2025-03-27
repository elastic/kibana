/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiComboBox, EuiComboBoxOptionOption, EuiFormRow } from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';
import { useGetInternalRuleTypesQuery } from '@kbn/response-ops-rules-apis/hooks/use_get_internal_rule_types_query';
import { EuiComboBoxProps } from '@elastic/eui/src/components/combo_box/combo_box';
import { SetRequired } from 'type-fest';
import { ALERT_RULE_TYPE_ID } from '@kbn/rule-data-utils';
import { AlertsFilterComponentType, AlertsFilterMetadata } from '../types';
import { useAlertsFiltersFormContext } from '../contexts/alerts_filters_form_context';
import { RULE_TYPES_FILTER_LABEL, RULE_TYPES_LOAD_ERROR_MESSAGE } from '../translations';

/**
 * Filters by one or more rule tags
 */
export const AlertsFilterByRuleTypes: AlertsFilterComponentType<string[]> = ({
  value,
  onChange,
  isDisabled = false,
}) => {
  const { ruleTypeIds, http } = useAlertsFiltersFormContext();

  const {
    data: ruleTypes,
    isLoading,
    isError,
  } = useGetInternalRuleTypesQuery({
    http,
  });

  const options = useMemo<Array<SetRequired<EuiComboBoxOptionOption<string>, 'value'>>>(
    () =>
      ruleTypes
        // Only suggest allowed rule type ids
        ?.filter((ruleType) => ruleTypeIds.includes(ruleType.id))
        .map((ruleType) => ({
          value: ruleType.id,
          label: ruleType.name,
        })) ?? [],
    [ruleTypeIds, ruleTypes]
  );

  const selectedOptions = useMemo(
    () => options.filter((option) => value?.includes(option.value)),
    [options, value]
  );

  const onSelectedOptionsChange = useCallback<NonNullable<EuiComboBoxProps<string>['onChange']>>(
    (newOptions) => {
      onChange?.(newOptions.map((option) => option.value!));
    },
    [onChange]
  );

  return (
    <EuiFormRow
      label={RULE_TYPES_FILTER_LABEL}
      isDisabled={isDisabled || isError}
      isInvalid={isError}
      error={RULE_TYPES_LOAD_ERROR_MESSAGE}
      fullWidth
    >
      <EuiComboBox
        isClearable
        isLoading={isLoading}
        isDisabled={isDisabled || isError}
        isInvalid={isError}
        options={options}
        selectedOptions={selectedOptions}
        onChange={onSelectedOptionsChange}
        fullWidth
      />
    </EuiFormRow>
  );
};

export const filterMetadata: AlertsFilterMetadata<string[]> = {
  id: 'ruleTypes',
  displayName: RULE_TYPES_FILTER_LABEL,
  component: AlertsFilterByRuleTypes,
  isEmpty: (value?: string[]) => !value?.length,
  toEsQuery: (value: string[]) => {
    return {
      terms: {
        [ALERT_RULE_TYPE_ID]: value,
      },
    };
  },
};
