/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ValidFeatureId } from '@kbn/rule-data-utils';
import { Filter } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import { EuiSwitch, EuiSpacer } from '@elastic/eui';
import type { AlertsFilter } from '@kbn/alerting-types';
import deepEqual from 'fast-deep-equal';
import { useRuleFormState } from '../hooks';
import { RuleAction } from '../../common';
import { RuleFormPlugins } from '../types';
import { AlertsSearchBar, AlertsSearchBarProps } from '../../alerts_search_bar';

const DEFAULT_QUERY = { kql: '', filters: [] };

export interface RuleActionsAlertsFilterProps {
  action: RuleAction;
  onChange: (update?: AlertsFilter['query']) => void;
  appName: string;
  featureIds: ValidFeatureId[];
  ruleTypeId?: string;
  plugins?: {
    http: RuleFormPlugins['http'];
    notifications: RuleFormPlugins['notifications'];
    unifiedSearch: RuleFormPlugins['unifiedSearch'];
    data: RuleFormPlugins['data'];
  };
}

export const RuleActionsAlertsFilter = ({
  action,
  onChange,
  appName,
  featureIds,
  ruleTypeId,
  plugins: propsPlugins,
}: RuleActionsAlertsFilterProps) => {
  const { plugins } = useRuleFormState();
  const {
    http,
    notifications: { toasts },
    unifiedSearch,
    data,
  } = propsPlugins || plugins;

  const [query, setQuery] = useState(action.alertsFilter?.query ?? DEFAULT_QUERY);

  const state = useMemo(() => {
    return action.alertsFilter?.query;
  }, [action]);

  const queryEnabled = useMemo(() => Boolean(state), [state]);

  useEffect(() => {
    const nextState = queryEnabled ? query : undefined;
    if (!deepEqual(state, nextState)) onChange(nextState);
  }, [queryEnabled, query, state, onChange]);

  const toggleQuery = useCallback(
    () => onChange(state ? undefined : query),
    [state, query, onChange]
  );

  const updateQuery = useCallback(
    (update: Partial<AlertsFilter['query']>) => {
      setQuery({
        ...query,
        ...update,
      });
    },
    [query, setQuery]
  );

  const onQueryChange = useCallback<NonNullable<AlertsSearchBarProps['onQueryChange']>>(
    ({ query: newQuery }) => updateQuery({ kql: newQuery }),
    [updateQuery]
  );

  const onFiltersUpdated = useCallback(
    (filters: Filter[]) => {
      const updatedFilters = filters.map((filter) => {
        const { $state, meta, ...rest } = filter;
        return {
          $state,
          meta,
          query: filter?.query ? { ...filter.query } : { ...rest },
        };
      });

      // Wrapping filters in query object here to avoid schema validation failure
      updateQuery({ filters: updatedFilters });
    },
    [updateQuery]
  );

  return (
    <>
      <EuiSwitch
        label={i18n.translate(
          'alertsUIShared.ruleActionsAlertsFilter.ActionAlertsFilterQueryToggleLabel',
          {
            defaultMessage: 'If alert matches a query',
          }
        )}
        checked={queryEnabled}
        onChange={toggleQuery}
        data-test-subj="alertsFilterQueryToggle"
      />
      {queryEnabled && (
        <>
          <EuiSpacer size="s" />
          <AlertsSearchBar
            http={http}
            toasts={toasts}
            unifiedSearchBar={unifiedSearch.ui.SearchBar}
            dataService={data}
            appName={appName}
            featureIds={featureIds}
            ruleTypeId={ruleTypeId}
            disableQueryLanguageSwitcher={true}
            query={query.kql}
            filters={query.filters ?? []}
            onQueryChange={onQueryChange}
            onQuerySubmit={onQueryChange}
            onFiltersUpdated={onFiltersUpdated}
            showFilterBar
            submitOnBlur
            showDatePicker={false}
            showSubmitButton={false}
            placeholder={i18n.translate(
              'alertsUIShared.ruleActionsAlertsFilter.ActionAlertsFilterQueryPlaceholder',
              {
                defaultMessage: 'Filter alerts using KQL syntax',
              }
            )}
          />
        </>
      )}
    </>
  );
};
