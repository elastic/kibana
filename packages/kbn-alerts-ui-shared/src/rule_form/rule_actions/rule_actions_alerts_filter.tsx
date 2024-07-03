/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { ValidFeatureId } from '@kbn/rule-data-utils';
import { Filter } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import { EuiSwitch, EuiSpacer } from '@elastic/eui';
import deepEqual from 'fast-deep-equal';
import { AlertsFilter } from '@kbn/alerting-types';
import AlertsSearchBar from '../../alerts_search_bar';
import { useRuleFormState } from '../hooks';

interface RuleActionsAlertsFilterProps {
  state?: AlertsFilter['query'];
  onChange: (update?: AlertsFilter['query']) => void;
  appName: string;
  featureIds: ValidFeatureId[];
  ruleTypeId?: string;
}

export const RuleActionsAlertsFilter = ({
  state,
  onChange,
  appName,
  featureIds,
  ruleTypeId,
}: RuleActionsAlertsFilterProps) => {
  const {
    plugins: {
      http,
      notification: { toasts },
      unifiedSearch,
      dataViews,
    },
  } = useRuleFormState();

  const [query, setQuery] = useState(state ?? { kql: '', filters: [] });

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

  const onQueryChange = useCallback(
    ({ query: newQuery }) => updateQuery({ kql: newQuery }),
    [updateQuery]
  );

  const onFiltersUpdated = useCallback(
    (filters: Filter[]) => updateQuery({ filters }),
    [updateQuery]
  );

  return (
    <>
      <EuiSwitch
        label={i18n.translate(
          'xpack.triggersActionsUI.sections.actionTypeForm.ActionAlertsFilterQueryToggleLabel',
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
            dataViewsService={dataViews}
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
              'xpack.triggersActionsUI.sections.actionTypeForm.ActionAlertsFilterQueryPlaceholder',
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
