/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { Suspense, lazy, useMemo } from 'react';
import { css } from '@emotion/react';
import { EuiFlexGroup, EuiFlexItem, EuiSkeletonText, euiFullHeight } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { DataView } from '@kbn/data-views-plugin/public';
import { isCombinedFilter, isOfQueryType, type Filter, type Query } from '@kbn/es-query';
import { omit } from 'lodash';
import type { VegaByValueState } from '../../server';
import type { VegaPluginStartDependencies } from '../plugin';
import { getData } from '../services';

/** Makes an `EuiFlyoutBody` fill the flyout so the spec editor can take the remaining height. */
export const vegaEditorFlyoutBodyCss = css`
  ${euiFullHeight()}
  .euiFlyoutBody__overflow {
    ${euiFullHeight()}
    min-height: 0;
  }

  .euiFlyoutBody__overflowContent {
    ${euiFullHeight()}
    min-height: 0;
  }
`;

const VegaSpecEditor = lazy(() =>
  import('./vega_vis_editor').then((module) => ({ default: module.VegaSpecEditor }))
);

export const omitDataViewId = (filters: Filter[], dataViewId: string | undefined): Filter[] =>
  filters.map((filter) =>
    dataViewId !== undefined && filter.meta.index === dataViewId
      ? { ...filter, meta: omit(filter.meta, 'index') }
      : filter
  );

export const bindDataViewId = (filter: Filter, dataViewId: string): Filter => ({
  ...filter,
  meta: {
    ...filter.meta,
    ...(filter.meta.index === undefined && { index: dataViewId }),
    ...(isCombinedFilter(filter) && {
      params: filter.meta.params.map((child) => bindDataViewId(child, dataViewId)),
    }),
  },
});

export interface VegaEditorBodyProps {
  SearchBar: VegaPluginStartDependencies['unifiedSearch']['ui']['SearchBar'];
  /** The data views the search bar suggests fields from. */
  dataViews: DataView[];
  query?: Query;
  filters?: Filter[];
  /** Called with `undefined` when the query is cleared. */
  onQueryChange: (query: Query | undefined) => void;
  /** Called with `undefined` when the last filter is removed. */
  onFiltersChange: (filters: Filter[] | undefined) => void;
  /** The text in the spec editor. */
  spec: string;
  initialFormat: VegaByValueState['spec']['format'];
  onSpecChange: (spec: string) => void;
  onFormatChange: (format: VegaByValueState['spec']['format']) => void;
}

/** The query bar and spec editor shared by the dashboard panel and library item editors. */
export const VegaEditorBody = ({
  SearchBar,
  dataViews,
  query,
  filters,
  onQueryChange,
  onFiltersChange,
  spec,
  initialFormat,
  onSpecChange,
  onFormatChange,
}: VegaEditorBodyProps) => {
  // Filters on the only ad-hoc data view are stored without its id, because the id isn't a
  // saved object and a reference to it fails import. The search bar gets the id back, because the
  // filter editor opens an empty filter when it can't match one.
  const adHocDataViews = dataViews.filter((dataView) => !dataView.isPersisted());
  const implicitDataViewId = adHocDataViews.length === 1 ? adHocDataViews[0].id : undefined;
  const searchBarFilters = useMemo(
    () =>
      (filters ?? []).map((filter) =>
        implicitDataViewId ? bindDataViewId(filter, implicitDataViewId) : filter
      ),
    [implicitDataViewId, filters]
  );

  return (
    <EuiFlexGroup css={{ height: '100%' }} direction="column" gutterSize="m">
      <EuiFlexItem grow={false}>
        <SearchBar
          appName="vegaEditorFlyout"
          query={isOfQueryType(query) ? query : getData().query.queryString.getDefaultQuery()}
          filters={searchBarFilters}
          indexPatterns={dataViews}
          showQueryInput
          showFilterBar
          // Pinned filters live in global state, which panel filters are not persisted to.
          hiddenFilterPanelOptions={['pinFilter']}
          showDatePicker={false}
          showSubmitButton
          showSavedQueryControls={false}
          isAutoRefreshDisabled
          useDefaultBehaviors={false}
          disableSubscribingToGlobalDataServices
          onQuerySubmit={({ query: next }) => {
            const submitted = next && isOfQueryType(next) ? next : undefined;
            if (
              !submitted ||
              typeof submitted.query !== 'string' ||
              submitted.query.trim() === ''
            ) {
              onQueryChange(undefined);
              return;
            }
            onQueryChange({ language: submitted.language, query: submitted.query });
          }}
          onFiltersUpdated={(next) => {
            onFiltersChange(next.length > 0 ? omitDataViewId(next, implicitDataViewId) : undefined);
          }}
          displayStyle="inPage"
          dataTestSubj="editorFlyoutSearchBar"
        />
      </EuiFlexItem>
      <EuiFlexItem css={{ minHeight: 0 }}>
        <Suspense
          fallback={
            <EuiSkeletonText
              lines={3}
              data-test-subj="vegaEditorFlyoutLoading"
              aria-label={i18n.translate('visTypeVega.dashboard.editorLoadingAriaLabel', {
                defaultMessage: 'Loading Vega editor',
              })}
            />
          }
        >
          <VegaSpecEditor
            editorValue={spec}
            initialFormat={initialFormat}
            onChange={onSpecChange}
            onFormatChange={onFormatChange}
            actionsPlacement="toolbar"
          />
        </Suspense>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
