/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { Suspense, lazy, useEffect, useRef, useState } from 'react';
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
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { EditorMenuManager } from '@kbn/presentation-util';
import type { QueryState } from '@kbn/data-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/public';
import { isOfQueryType, type Query } from '@kbn/es-query';
import {
  apiPublishesDataViews,
  apiPublishesWritableUnifiedSearch,
  useStateFromPublishingSubject,
  type PublishesWritableUnifiedSearch,
} from '@kbn/presentation-publishing';
import type { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';
import { isEqual } from 'lodash';
import { VegaEditorMenu } from './vega_editor_menu';
import type { VegaByValueState } from '../../server';

type PanelSearch = Omit<QueryState, 'time' | 'refreshInterval'>;

const emptySearch: PanelSearch = { query: undefined, filters: undefined };
const emptyQuery: Query = { language: 'kuery', query: '' };

const bodyCss = css({
  '.euiFlyoutBody__overflowContent': {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    minHeight: 0,
  },
});

const searchBarCss = css({
  flexShrink: 0,
});

const contentCss = css({
  display: 'flex',
  flex: 1,
  flexDirection: 'column',
  minHeight: 0,
});

const readPanelSearch = (api: PublishesWritableUnifiedSearch): PanelSearch => {
  const published = api.query$.getValue();
  let query: Query | undefined;
  if (
    isOfQueryType(published) &&
    typeof published.query === 'string' &&
    published.query.trim() !== ''
  ) {
    query = { language: published.language, query: published.query };
  }
  const filters = api.filters$.getValue();
  return { query, filters: filters && filters.length > 0 ? filters : undefined };
};

const readSearchSnapshot = (api: PublishesWritableUnifiedSearch): PanelSearch => {
  const published = api.query$.getValue();
  return {
    query: isOfQueryType(published) ? published : undefined,
    filters: api.filters$.getValue(),
  };
};

const sameSearch = (left: PanelSearch, right: PanelSearch): boolean =>
  isEqual(left.query, right.query) && isEqual(left.filters ?? [], right.filters ?? []);

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
  ariaLabelledBy,
  closeFlyout,
  initialSpec,
  menuManager,
  SearchBar,
  isNewPanel = false,
  onPreview,
  onRevert,
  onSave,
}: {
  menuManager: EditorMenuManager;
  SearchBar: UnifiedSearchPublicPluginStart['ui']['SearchBar'];
  ariaLabelledBy: string;
  closeFlyout: () => void;
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
  const api = useStateFromPublishingSubject(menuManager.panelApi$);
  const searchApi = apiPublishesWritableUnifiedSearch(api) ? api : undefined;
  const [search, setSearch] = useState<PanelSearch>(emptySearch);
  const [previewedSearch, setPreviewedSearch] = useState<PanelSearch>(emptySearch);
  const [searchReady, setSearchReady] = useState(false);
  const [dataViews, setDataViews] = useState<DataView[]>([]);
  const openedSearchRef = useRef<PanelSearch | null>(null);
  const openedSnapshotRef = useRef<PanelSearch | null>(null);
  const searchApiRef = useRef(searchApi);
  searchApiRef.current = searchApi;

  const openedSearch = openedSearchRef.current ?? emptySearch;
  const searchChanged = searchReady && !sameSearch(search, openedSearch);
  const searchUnpreviewed = searchReady && !sameSearch(search, previewedSearch);
  const canPreview = spec !== previewedSpec || searchUnpreviewed;
  const canSave = isNewPanel || spec !== initialEditorValue || searchChanged;

  // Revert on unmount unless the user saved. A ref holds the latest callback without re-arming the
  // unmount effect; `saved` suppresses the revert after a successful Save. Declared before the
  // search subscription so that subscription is torn down before the snapshot is written back.
  const saved = useRef(false);
  const onRevertRef = useRef(onRevert);
  onRevertRef.current = onRevert;
  useEffect(
    () => () => {
      if (saved.current) return;
      const snapshot = openedSnapshotRef.current;
      const current = searchApiRef.current;
      if (snapshot && current) {
        const query = snapshot.query;
        current.setQuery(query && isOfQueryType(query) ? query : undefined);
        current.setFilters(snapshot.filters);
      }
      onRevertRef.current();
    },
    []
  );

  useEffect(() => {
    if (!searchApi) {
      setDataViews([]);
      return;
    }
    const sync = () => {
      const next = readPanelSearch(searchApi);
      setSearch((current) => (sameSearch(current, next) ? current : next));
    };
    if (!openedSearchRef.current) {
      const initial = readPanelSearch(searchApi);
      openedSearchRef.current = initial;
      openedSnapshotRef.current = readSearchSnapshot(searchApi);
      setPreviewedSearch(initial);
      setSearch(initial);
      setSearchReady(true);
    }
    sync();
    const querySubscription = searchApi.query$.subscribe(sync);
    const filtersSubscription = searchApi.filters$.subscribe(sync);
    const dataViewsApi = apiPublishesDataViews(searchApi) ? searchApi : undefined;
    const dataViewsSubscription = dataViewsApi
      ? dataViewsApi.dataViews$.subscribe((next) => setDataViews(next ?? []))
      : undefined;
    if (dataViewsApi) {
      setDataViews(dataViewsApi.dataViews$.getValue() ?? []);
    }
    return () => {
      querySubscription.unsubscribe();
      filtersSubscription.unsubscribe();
      dataViewsSubscription?.unsubscribe();
    };
  }, [searchApi]);

  const previewChanges = () => {
    onPreview(specFromEditor(spec, format));
    setPreviewedSpec(spec);
    setPreviewedSearch(search);
  };

  const applyQuery = (next: Query | undefined) => {
    if (!searchApi) return;
    if (!next || typeof next.query !== 'string' || next.query.trim() === '') {
      searchApi.setQuery(undefined);
      return;
    }
    searchApi.setQuery({ language: next.language, query: next.query });
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
          <h2 id={ariaLabelledBy}>Vega</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody css={bodyCss} data-test-subj="editorFlyoutBody">
        {searchApi && (
          <>
            <div css={searchBarCss}>
              <SearchBar
                appName="vegaEditorFlyout"
                query={search.query && isOfQueryType(search.query) ? search.query : emptyQuery}
                filters={search.filters}
                indexPatterns={dataViews}
                showQueryInput
                showFilterBar
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
                  searchApi.setFilters(next.length > 0 ? next : undefined);
                }}
                displayStyle="inPage"
                dataTestSubj="editorFlyoutSearchBar"
              />
            </div>
            <EuiSpacer size="l" />
          </>
        )}
        <div css={contentCss}>
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
              renderControls={(actions) => (
                <VegaEditorMenu menuManager={menuManager} {...actions} />
              )}
              editorValue={spec}
              initialFormat={initialSpec.format}
              onChange={setSpec}
              onFormatChange={setFormat}
            />
          </Suspense>
        </div>
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
                    defaultMessage: 'Run Preview',
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
