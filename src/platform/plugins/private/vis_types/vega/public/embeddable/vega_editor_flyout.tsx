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
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { QueryState } from '@kbn/data-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/public';
import { isOfQueryType, type Query } from '@kbn/es-query';
import { useBatchedPublishingSubjects } from '@kbn/presentation-publishing';
import type { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';
import { isEqual } from 'lodash';
import type { VegaByValueState } from '../../server';
import { getDataViews } from '../services';
import { vegaTitleInWizard } from '../vega_icon';
import type { VegaEmbeddableApi } from './vega_embeddable';

type PanelSearch = Omit<QueryState, 'time' | 'refreshInterval'>;

const emptyQuery: Query = { language: 'kuery', query: '' };

const searchBarCss = css({
  flexShrink: 0,
});

const bodyCss = css({
  display: 'flex',
  flex: 1,
  flexDirection: 'column',
  gap: 16,
  minHeight: 0,
});

const editorContainerCss = css({
  blockSize: 'clamp(320px, 60vh, 720px)',
  display: 'flex',
  minHeight: 0,
  overflow: 'hidden',
});

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
  api,
  ariaLabelledBy,
  closeFlyout,
  initialSpec,
  SearchBar,
  isNewPanel = false,
  onPreview,
  onRevert,
  onSave,
}: {
  api: VegaEmbeddableApi;
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
  const [publishedQuery, publishedFilters, publishedDataViews] = useBatchedPublishingSubjects(
    api.query$,
    api.filters$,
    api.dataViews$
  );
  // Like Visualize's search bar, fall back to the default data view when the spec names none.
  const [defaultDataView, setDefaultDataView] = useState<DataView | undefined>();
  const needsDefaultDataView = publishedDataViews?.length === 0;
  useEffect(() => {
    if (!needsDefaultDataView || defaultDataView) return;
    let cancelled = false;
    getDataViews()
      .getDefault()
      .then((dataView) => {
        if (!cancelled && dataView) setDefaultDataView(dataView);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [needsDefaultDataView, defaultDataView]);
  const dataViews = publishedDataViews?.length
    ? publishedDataViews
    : defaultDataView
    ? [defaultDataView]
    : [];
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
      <EuiFlyoutBody data-test-subj="editorFlyoutBody">
        <div css={bodyCss}>
          <div css={searchBarCss}>
            <SearchBar
              appName="vegaEditorFlyout"
              query={search.query && isOfQueryType(search.query) ? search.query : emptyQuery}
              filters={search.filters ?? []}
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
                api.setFilters(next.length > 0 ? next : undefined);
              }}
              displayStyle="inPage"
              dataTestSubj="editorFlyoutSearchBar"
            />
          </div>
          <div css={editorContainerCss}>
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
              />
            </Suspense>
          </div>
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
