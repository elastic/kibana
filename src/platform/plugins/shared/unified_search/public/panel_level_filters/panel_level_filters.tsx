/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState } from 'react';
import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { Filter, Query } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import { QueryStringInput } from '@kbn/kql/public';
import { KibanaContextProvider, useKibana } from '@kbn/kibana-react-plugin/public';
import { AddFilterPopover } from '../query_string_input/add_filter_popover';
import { FilterItems } from '../filter_bar/filter_item/filter_items';
import { getPanelLevelFiltersServices } from '../services';
import type { IUnifiedSearchPluginServices } from '../types';

export interface PanelLevelFiltersProps {
  query: Query | undefined;
  filters: Filter[];
  dataViews: DataView[];
  onQueryChange: (query: Query | undefined) => void;
  onFiltersChange: (filters: Filter[]) => void;
}

const emptyQuery = (): Query => ({ language: 'kuery', query: '' });

const queryText = (query: Query): string =>
  typeof query.query === 'string' ? query.query : JSON.stringify(query.query);

/**
 * Panel-level KQL query and filter pills. Changes stay in the caller's draft until they save.
 * The query bar and filter editor read autocomplete, data views, and UI settings from the same
 * Kibana context `createSearchBar` provides to the dashboard search bar.
 */
export const PanelLevelFilters = (props: PanelLevelFiltersProps): React.ReactElement => {
  const services = getPanelLevelFiltersServices();
  const view = <PanelLevelFiltersView {...props} />;
  if (!services) return view;

  return (
    <KibanaContextProvider
      services={{
        appName: 'panelLevelFilters',
        ...services.core,
        data: services.data,
        dataViews: services.dataViews,
        storage: services.storage,
        kql: services.kql,
        usageCollection: services.usageCollection,
        cps: services.cps,
        esql: services.esql,
        licensing: services.licensing,
      }}
    >
      {view}
    </KibanaContextProvider>
  );
};

const PanelLevelFiltersView = ({
  query,
  filters,
  dataViews,
  onQueryChange,
  onFiltersChange,
}: PanelLevelFiltersProps): React.ReactElement => {
  const [isEditingQuery, setIsEditingQuery] = useState(false);
  const hasDataViews = dataViews.length > 0;
  const noDataViewMessage = i18n.translate(
    'unifiedSearch.panelLevelFilters.noDataViewTooltip',
    { defaultMessage: 'This panel has no data view to suggest fields from.' }
  );

  return (
    <>
      <EuiTitle size="xxs">
        <h3>
          {i18n.translate('unifiedSearch.panelLevelFilters.queryLabel', {
            defaultMessage: 'Query',
          })}
        </h3>
      </EuiTitle>
      <EuiSpacer size="s" />
      {isEditingQuery ? (
        <QueryEditor
          dataViews={dataViews}
          query={query ?? emptyQuery()}
          onChange={(next) => {
            onQueryChange(next.query.trim() === '' ? undefined : next);
          }}
        />
      ) : (
        <EuiPanel color="subdued" paddingSize="m" hasShadow={false}>
          <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiIcon type="search" />
            </EuiFlexItem>
            <EuiFlexItem>
              {query ? (
                <EuiText size="s" data-test-subj="panelLevelFiltersQuery">
                  <strong>{queryText(query)}</strong>
                </EuiText>
              ) : (
                <>
                  <EuiText size="s">
                    <strong>
                      {i18n.translate('unifiedSearch.panelLevelFilters.noQueryTitle', {
                        defaultMessage: 'No query applied',
                      })}
                    </strong>
                  </EuiText>
                  <EuiText size="s" color="subdued">
                    {i18n.translate('unifiedSearch.panelLevelFilters.noQueryDescription', {
                      defaultMessage: 'Use KQL or Lucene to narrow panel data.',
                    })}
                  </EuiText>
                </>
              )}
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                size="s"
                disabled={!hasDataViews}
                title={hasDataViews ? undefined : noDataViewMessage}
                data-test-subj="panelLevelFiltersEditQuery"
                onClick={() => setIsEditingQuery(true)}
              >
                {query
                  ? i18n.translate('unifiedSearch.panelLevelFilters.editQueryButton', {
                      defaultMessage: 'Edit query',
                    })
                  : i18n.translate('unifiedSearch.panelLevelFilters.addQueryButton', {
                      defaultMessage: 'Add query',
                    })}
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
      )}
      <EuiSpacer size="l" />
      <EuiTitle size="xxs">
        <h3>
          {i18n.translate('unifiedSearch.panelLevelFilters.filtersLabel', {
            defaultMessage: 'Filters',
          })}
        </h3>
      </EuiTitle>
      <EuiSpacer size="s" />
      {filters.length > 0 && (
        <>
          <EuiFlexGroup wrap gutterSize="xs" data-test-subj="panelLevelFiltersPills">
            <FilterItems
              filters={filters}
              indexPatterns={dataViews}
              onFiltersUpdated={onFiltersChange}
            />
          </EuiFlexGroup>
          <EuiSpacer size="s" />
        </>
      )}
      <AddFilterPopover
        showLabel
        filters={filters}
        indexPatterns={dataViews}
        isDisabled={!hasDataViews}
        onFiltersUpdated={onFiltersChange}
      />
    </>
  );
};

const QueryEditor = ({
  dataViews,
  query,
  onChange,
}: {
  dataViews: DataView[];
  query: Query;
  onChange: (query: Query) => void;
}): React.ReactElement | null => {
  const { services } = useKibana<IUnifiedSearchPluginServices>();
  const {
    appName,
    kql,
    data,
    storage,
    usageCollection,
    notifications,
    docLinks,
    http,
    uiSettings,
    dataViews: dataViewsStart,
  } = services;
  if (
    !kql ||
    !data ||
    !storage ||
    !notifications ||
    !docLinks ||
    !http ||
    !uiSettings ||
    !dataViewsStart
  ) {
    return null;
  }

  return (
    <QueryStringInput
      indexPatterns={dataViews}
      query={query}
      onChange={(next) => {
        if (typeof next.query === 'string') onChange(next);
      }}
      onSubmit={(next) => {
        if (typeof next.query === 'string') onChange(next);
      }}
      submitOnBlur
      appName={appName}
      dataTestSubj="panelLevelFiltersQueryInput"
      deps={{
        autocomplete: kql.autocomplete,
        data,
        storage,
        usageCollection,
        notifications,
        docLinks,
        http,
        uiSettings,
        dataViews: dataViewsStart,
      }}
    />
  );
};
