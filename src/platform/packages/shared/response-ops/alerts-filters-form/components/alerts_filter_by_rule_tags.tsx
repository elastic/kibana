/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiComboBox, EuiComboBoxOptionOption, EuiFormRow } from '@elastic/eui';
import { useGetRuleTagsQuery } from '@kbn/response-ops-rules-apis/hooks/use_get_rule_tags_query';
import React, { useCallback, useMemo } from 'react';
import { EuiComboBoxProps } from '@elastic/eui/src/components/combo_box/combo_box';
import {
  RULE_TAGS_FILTER_LABEL,
  RULE_TAGS_FILTER_NO_OPTIONS_PLACEHOLDER,
  RULE_TAGS_FILTER_PLACEHOLDER,
  RULE_TAGS_LOAD_ERROR_MESSAGE,
} from '../translations';
import { useAlertsFiltersFormContext } from '../contexts/alerts_filters_form_context';
import { AlertsFilterComponentType, AlertsFilterMetadata } from '../types';

export const AlertsFilterByRuleTags: AlertsFilterComponentType<string[]> = ({
  value,
  onChange,
  isDisabled = false,
}) => {
  const {
    ruleTypeIds,
    services: {
      http,
      notifications: { toasts },
    },
  } = useAlertsFiltersFormContext();

  const { tags, isLoading, isError } = useGetRuleTagsQuery({
    enabled: true,
    perPage: 10000,
    // Only search tags from allowed rule type ids
    ruleTypeIds,
    http,
    toasts,
  });

  const options = useMemo<Array<EuiComboBoxOptionOption<string>>>(
    () =>
      tags.map((tag) => ({
        label: tag,
      })),
    [tags]
  );

  const selectedOptions = useMemo(
    () => options.filter(({ label }) => value?.includes(label)),
    [options, value]
  );

  const onSelectedOptionsChange = useCallback<NonNullable<EuiComboBoxProps<string>['onChange']>>(
    (newOptions) => {
      onChange?.(newOptions.map(({ label }) => label));
    },
    [onChange]
  );

  return (
    <EuiFormRow
      label={RULE_TAGS_FILTER_LABEL}
      isDisabled={isDisabled || isError}
      isInvalid={isError}
      error={RULE_TAGS_LOAD_ERROR_MESSAGE}
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
          !options.length ? RULE_TAGS_FILTER_NO_OPTIONS_PLACEHOLDER : RULE_TAGS_FILTER_PLACEHOLDER
        }
        fullWidth
      />
    </EuiFormRow>
  );
};

export const filterMetadata = {
  id: 'ruleTags',
  displayName: RULE_TAGS_FILTER_LABEL,
  component: AlertsFilterByRuleTags,
  isEmpty: (value?: string[]) => !Boolean(value?.length),
} as const satisfies AlertsFilterMetadata<string[]>;
