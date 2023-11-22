/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useState } from 'react';
import { Query, TimeRange } from '@kbn/es-query';
import { SuggestionsAbstraction } from '@kbn/unified-search-plugin/public/typeahead/suggestions_component';
import { AlertConsumers } from '@kbn/rule-data-utils';
import { NO_INDEX_PATTERNS } from './constants';
import { SEARCH_BAR_PLACEHOLDER } from './translations';
import { AlertsSearchBarProps, QueryLanguageType } from './types';
import { useAlertDataView } from './hooks/use_alert_data_view'; 
import { useRuleAADFields } from './hooks/use_rule_aad_fields';
import { useLoadRuleTypesQuery } from './hooks/use_load_rule_types_query';

const SA_ALERTS = { type: 'alerts', fields: {} } as SuggestionsAbstraction;

export const AlertsSearchBar = ({
  appName,
  disableQueryLanguageSwitcher = false,
  featureIds,
  ruleTypeId,
  query,
  filters,
  onQueryChange,
  onQuerySubmit,
  onFiltersUpdated,
  rangeFrom,
  rangeTo,
  showFilterBar = false,
  showDatePicker = true,
  showSubmitButton = true,
  placeholder = SEARCH_BAR_PLACEHOLDER,
  submitOnBlur = false,
  http,
  toasts,
  unifiedSearchBar,
  dataViewsService,
}: AlertsSearchBarProps) => {
  const [queryLanguage, setQueryLanguage] = useState<QueryLanguageType>('kuery');
  const { dataViews, loading } = useAlertDataView({
    featureIds: featureIds ?? [],
    http,
    toasts,
    dataViewsService,
  });
  const { aadFields, loading: fieldsLoading } = useRuleAADFields({
    ruleTypeId: ruleTypeId,
    http,
    toasts,
  });

  const indexPatterns =
    ruleTypeId && aadFields?.length ? [{ title: ruleTypeId, fields: aadFields }] : dataViews;

  const ruleType = useLoadRuleTypesQuery({
    filteredRuleTypes: ruleTypeId !== undefined ? [ruleTypeId] : [],
    enabled: ruleTypeId !== undefined,
    http,
    toasts,
  });

  const isSecurity =
    (featureIds && featureIds.length === 1 && featureIds.includes(AlertConsumers.SIEM)) ||
    (ruleType &&
      ruleTypeId &&
      ruleType.ruleTypesState.data.get(ruleTypeId)?.producer === AlertConsumers.SIEM);

  const onSearchQuerySubmit = useCallback(
    ({ dateRange, query: nextQuery }: { dateRange: TimeRange; query?: Query }) => {
      onQuerySubmit({
        dateRange,
        query: typeof nextQuery?.query === 'string' ? nextQuery.query : undefined,
      });
      setQueryLanguage((nextQuery?.language ?? 'kuery') as QueryLanguageType);
    },
    [onQuerySubmit, setQueryLanguage]
  );

  const onSearchQueryChange = useCallback(
    ({ dateRange, query: nextQuery }: { dateRange: TimeRange; query?: Query }) => {
      onQueryChange?.({
        dateRange,
        query: typeof nextQuery?.query === 'string' ? nextQuery.query : undefined,
      });
      setQueryLanguage((nextQuery?.language ?? 'kuery') as QueryLanguageType);
    },
    [onQueryChange, setQueryLanguage]
  );
  const onRefresh = ({ dateRange }: { dateRange: TimeRange }) => {
    onQuerySubmit({
      dateRange,
    });
  };

  return unifiedSearchBar({
    appName: appName,
    disableQueryLanguageSwitcher: disableQueryLanguageSwitcher,
    // @ts-expect-error - DataView fields prop and SearchBar indexPatterns props are overly broad
    indexPatterns: loading || fieldsLoading ? NO_INDEX_PATTERNS : indexPatterns,
    placeholder: placeholder,
    query: { query: query ?? '', language: queryLanguage },
    filters: filters,
    dateRangeFrom: rangeFrom,
    dateRangeTo: rangeTo,
    displayStyle: "inPage",
    showFilterBar: showFilterBar,
    onQuerySubmit: onSearchQuerySubmit,
    onFiltersUpdated: onFiltersUpdated,
    onRefresh: onRefresh,
    showDatePicker: showDatePicker,
    showQueryInput: true,
    saveQueryMenuVisibility: "allowed_by_app_privilege",
    showSubmitButton: showSubmitButton,
    submitOnBlur: submitOnBlur,
    onQueryChange: onSearchQueryChange,
    suggestionsAbstraction: isSecurity ? undefined : SA_ALERTS,
  });
}

// eslint-disable-next-line import/no-default-export
export { AlertsSearchBar as default };
