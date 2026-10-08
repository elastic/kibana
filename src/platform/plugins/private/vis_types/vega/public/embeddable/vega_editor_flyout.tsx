/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiSkeletonText,
  EuiTitle,
  euiFullHeight,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { QueryState } from '@kbn/data-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/public';
import {
  COMPARE_ALL_OPTIONS,
  compareFilters,
  isCombinedFilter,
  isOfQueryType,
  type Filter,
  type Query,
} from '@kbn/es-query';
import { useBatchedPublishingSubjects } from '@kbn/presentation-publishing';
import { isEqual, omit } from 'lodash';
import type { VegaByValueState } from '../../server';
import type { VegaPluginStartDependencies } from '../plugin';
import { getData } from '../services';
import { vegaTitleInWizard } from '../vega_icon';
import type { VegaEmbeddableApi } from './vega_embeddable';

type PanelSearch = Pick<QueryState, 'query' | 'filters'>;

const flyoutBodyCss = css`
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

const sameSearch = (left: PanelSearch, right: PanelSearch): boolean =>
  isEqual(left.query, right.query) &&
  compareFilters(left.filters ?? [], right.filters ?? [], COMPARE_ALL_OPTIONS);

const omitDataViewId = (filters: Filter[], dataViewId: string | undefined): Filter[] =>
  filters.map((filter) =>
    dataViewId !== undefined && filter.meta.index === dataViewId
      ? { ...filter, meta: omit(filter.meta, 'index') }
      : filter
  );

const bindDataViewId = (filter: Filter, dataViewId: string): Filter => ({
  ...filter,
  meta: {
    ...filter.meta,
    ...(filter.meta.index === undefined && { index: dataViewId }),
    ...(isCombinedFilter(filter) && {
      params: filter.meta.params.map((child) => bindDataViewId(child, dataViewId)),
    }),
  },
});

const VegaSpecEditor = lazy(() =>
  import('../components/vega_vis_editor').then((module) => ({ default: module.VegaSpecEditor }))
);

const specFromEditor = (
  text: string,
  format: VegaByValueState['spec']['format']
): VegaByValueState['spec'] => {
  if (format === 'json') {
    try {
      return { format: 'json', value: JSON.parse(text) };
    } catch {
      return { format: 'hjson', value: text };
    }
  }
  return { format: 'hjson', value: text };
};

export const VegaEditorFlyout = ({
  api,
  ariaLabelledBy,
  closeFlyout,
  defaultDataView,
  initialSpec,
  SearchBar,
  isNewPanel = false,
  onPreview,
  onRevert,
  onSave,
}: {
  api: VegaEmbeddableApi;
  SearchBar: VegaPluginStartDependencies['unifiedSearch']['ui']['SearchBar'];
  ariaLabelledBy: string;
  closeFlyout: () => void;
  defaultDataView?: DataView;
  initialSpec: VegaByValueState['spec'];
  isNewPanel?: boolean;
  onPreview: (spec: VegaByValueState['spec']) => void;
  onRevert: () => void;
  onSave: (spec: VegaByValueState['spec']) => void;
}) => {
  const initialEditorValue =
    initialSpec.format === 'json' ? JSON.stringify(initialSpec.value, null, 2) : initialSpec.value;
  const [spec, setSpec] = useState(initialEditorValue);
  const [previewedSpec, setPreviewedSpec] = useState(initialEditorValue);
  const [format, setFormat] = useState<VegaByValueState['spec']['format']>(initialSpec.format);
  const [publishedQuery, publishedFilters, publishedDataViews] = useBatchedPublishingSubjects(
    api.query$,
    api.filters$,
    api.dataViews$
  );
  // Like Visualize's search bar, fall back to the default data view when the spec names none.
  const dataViews = publishedDataViews?.length
    ? publishedDataViews
    : defaultDataView
    ? [defaultDataView]
    : [];
  // Filters on the panel's only ad-hoc data view are stored without its id, because the id isn't a
  // saved object and a reference to it fails import. The search bar gets the id back, because the
  // filter editor opens an empty filter when it can't match one.
  const adHocDataViews = dataViews.filter((dataView) => !dataView.isPersisted());
  const implicitDataViewId = adHocDataViews.length === 1 ? adHocDataViews[0].id : undefined;
  const search = useMemo<PanelSearch>(
    () => ({
      query: isOfQueryType(publishedQuery) ? publishedQuery : undefined,
      filters: publishedFilters,
    }),
    [publishedFilters, publishedQuery]
  );
  const initialSearch = useMemo<PanelSearch>(
    () => ({
      query: isOfQueryType(api.query$.getValue()) ? api.query$.getValue() : undefined,
      filters: api.filters$.getValue(),
    }),
    [api]
  );
  const searchBarFilters = useMemo(
    () =>
      (search.filters ?? []).map((filter) =>
        implicitDataViewId ? bindDataViewId(filter, implicitDataViewId) : filter
      ),
    [implicitDataViewId, search.filters]
  );
  const canPreview = spec !== previewedSpec;
  const canSave = isNewPanel || spec !== initialEditorValue || !sameSearch(search, initialSearch);

  // Revert on unmount unless the user saved. A ref holds the latest callback without re-arming the
  // unmount effect; `saved` suppresses the revert after a successful Save.
  const saved = useRef(false);
  const onRevertRef = useRef(onRevert);
  onRevertRef.current = onRevert;
  useEffect(
    () => () => {
      if (saved.current) return;
      onRevertRef.current();
    },
    []
  );

  const previewChanges = () => {
    onPreview(specFromEditor(spec, format));
    setPreviewedSpec(spec);
  };

  const applyQuery = (next: Query | undefined) => {
    if (!next || typeof next.query !== 'string' || next.query.trim() === '') {
      api.setQuery(undefined);
      return;
    }
    api.setQuery({ language: next.language, query: next.query });
  };

  const handleSave = () => {
    saved.current = true;
    onSave(specFromEditor(spec, format));
    closeFlyout();
  };
  return (
    <>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id={ariaLabelledBy}>{vegaTitleInWizard}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody data-test-subj="editorFlyoutBody" css={flyoutBodyCss}>
        <EuiFlexGroup css={{ height: '100%' }} direction="column" gutterSize="m">
          <EuiFlexItem grow={false}>
            <SearchBar
              appName="vegaEditorFlyout"
              query={
                isOfQueryType(search.query)
                  ? search.query
                  : getData().query.queryString.getDefaultQuery()
              }
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
                applyQuery(next && isOfQueryType(next) ? next : undefined);
              }}
              onFiltersUpdated={(next) => {
                api.setFilters(
                  next.length > 0 ? omitDataViewId(next, implicitDataViewId) : undefined
                );
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
                initialFormat={initialSpec.format}
                onChange={setSpec}
                onFormatChange={setFormat}
                actionsPlacement="toolbar"
              />
            </Suspense>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup responsive={false} justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              flush="left"
              onClick={closeFlyout}
              data-test-subj="vegaEditorFlyoutCancelButton"
            >
              {i18n.translate('visTypeVega.dashboard.cancelButtonLabel', {
                defaultMessage: 'Cancel',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="m" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiButton
                  color="success"
                  iconType="play"
                  disabled={!canPreview}
                  onClick={previewChanges}
                  data-test-subj="vegaEditorFlyoutPreviewButton"
                >
                  {i18n.translate('visTypeVega.dashboard.previewButtonLabel', {
                    defaultMessage: 'Run preview',
                  })}
                </EuiButton>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton
                  fill
                  disabled={!canSave}
                  onClick={handleSave}
                  data-test-subj="vegaEditorFlyoutSaveButton"
                >
                  {i18n.translate('visTypeVega.dashboard.applyAndCloseButtonLabel', {
                    defaultMessage: 'Apply and close',
                  })}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </>
  );
};
