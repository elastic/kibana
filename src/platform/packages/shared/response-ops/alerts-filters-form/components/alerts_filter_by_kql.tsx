/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiFormRow } from '@elastic/eui';
import { AlertsSearchBar } from '@kbn/alerts-ui-shared';
import { OBSERVABILITY_RULE_TYPE_IDS } from '@kbn/rule-data-utils';
import React from 'react';
import { KQL_FILTER_LABEL, KQL_FILTER_PLACEHOLDER } from '../translations';
import type { AlertsFilterComponentType, AlertsFilterMetadata } from '../types';
import { useAlertsFiltersFormContext } from '../contexts/alerts_filters_form_context';

export const AlertsFilterByKql: AlertsFilterComponentType<string> = ({
  value,
  onChange,
  isDisabled: isDisabledProp = false,
  error,
}) => {
  const { services } = useAlertsFiltersFormContext();
  const { unifiedSearch, data } = services;
  const {
    http,
    notifications: { toasts },
  } = services;
  const isInvalid = Boolean(error);
  const isDisabled = isDisabledProp;

  return (
    <EuiFormRow
      label={KQL_FILTER_LABEL}
      isDisabled={isDisabled}
      isInvalid={isInvalid}
      error={error}
      fullWidth
    >
      <AlertsSearchBar
        http={http}
        toasts={toasts}
        unifiedSearchBar={unifiedSearch.ui.SearchBar}
        dataService={data}
        appName="testingtesting"
        ruleTypeIds={OBSERVABILITY_RULE_TYPE_IDS}
        disableQueryLanguageSwitcher={true}
        showDatePicker={false}
        onQuerySubmit={() => {}}
        query={value}
        showSubmitButton={false}
        onQueryChange={(query) => onChange(query.query as string)}
        placeholder={KQL_FILTER_PLACEHOLDER}
      />
    </EuiFormRow>
  );
};

const isEmpty = (value?: string) => !value;

export const filterMetadata: AlertsFilterMetadata<string> = {
  id: 'kql',
  displayName: KQL_FILTER_LABEL,
  component: AlertsFilterByKql,
  isEmpty,
  toKql: (value?: string) => {
    if (!value || isEmpty(value)) {
      return null;
    }
    return value;
  },
};
