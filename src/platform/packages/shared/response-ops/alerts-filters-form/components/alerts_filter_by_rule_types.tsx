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
import { AlertsFilterComponentType, AlertsFilterMetadata } from '../types';
import { useAlertsFiltersFormContext } from '../contexts/alerts_filters_form_context';
import {
  RULE_TYPES_FILTER_LABEL,
  RULE_TYPES_FILTER_NO_OPTIONS_PLACEHOLDER,
  RULE_TYPES_FILTER_PLACEHOLDER,
  RULE_TYPES_LOAD_ERROR_MESSAGE,
} from '../translations';

export const AlertsFilterByRuleTypes: AlertsFilterComponentType<string[]> = ({
  value,
  onChange,
  isDisabled = false,
}) => {
  const {
    ruleTypeIds: allowedRuleTypeIds,
    services: { http },
  } = useAlertsFiltersFormContext();

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
        ?.filter((ruleType) => allowedRuleTypeIds.includes(ruleType.id))
        .map((ruleType) => ({
          value: ruleType.id,
          label: ruleType.name,
        })) ?? [],
    [allowedRuleTypeIds, ruleTypes]
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
        isDisabled={isDisabled || isError || !options.length}
        isInvalid={isError}
        options={options}
        selectedOptions={selectedOptions}
        onChange={onSelectedOptionsChange}
        placeholder={
          !options.length ? RULE_TYPES_FILTER_NO_OPTIONS_PLACEHOLDER : RULE_TYPES_FILTER_PLACEHOLDER
        }
        fullWidth
      />
    </EuiFormRow>
  );
};

export const filterMetadata = {
  id: 'ruleTypes',
  displayName: RULE_TYPES_FILTER_LABEL,
  component: AlertsFilterByRuleTypes,
  isEmpty: (value?: string[]) => !Boolean(value?.length),
} as const satisfies AlertsFilterMetadata<string[]>;
