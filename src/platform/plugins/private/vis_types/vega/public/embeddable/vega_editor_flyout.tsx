/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { Suspense, lazy, useEffect, useRef, useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiSkeletonText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  EditorFlyoutBody,
  type EditorFlyoutSearchBarProps,
  type EditorMenuManager,
} from '@kbn/presentation-util';
import { isOfQueryType, type Filter, type Query } from '@kbn/es-query';
import {
  apiPublishesWritableUnifiedSearch,
  useStateFromPublishingSubject,
  type PublishesWritableUnifiedSearch,
} from '@kbn/presentation-publishing';
import { isEqual } from 'lodash';
import { VegaEditorMenu } from './vega_editor_menu';
import type { VegaByValueState } from '../../server';

interface PanelSearchState {
  query: Query | undefined;
  filters: Filter[] | undefined;
}

const emptySearch: PanelSearchState = { query: undefined, filters: undefined };

const readPanelSearch = (api: PublishesWritableUnifiedSearch | undefined): PanelSearchState => {
  if (!api) return emptySearch;
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

const sameSearch = (left: PanelSearchState, right: PanelSearchState): boolean =>
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
  SearchBar: React.ComponentType<EditorFlyoutSearchBarProps>;
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
  const [search, setSearch] = useState<PanelSearchState>(emptySearch);
  const [previewedSearch, setPreviewedSearch] = useState<PanelSearchState>(emptySearch);
  const [searchReady, setSearchReady] = useState(false);
  const openedSearchRef = useRef<PanelSearchState | null>(null);

  useEffect(() => {
    if (!searchApi) return;
    const sync = () => {
      const next = readPanelSearch(searchApi);
      setSearch((current) => (sameSearch(current, next) ? current : next));
    };
    if (!openedSearchRef.current) {
      const initial = readPanelSearch(searchApi);
      openedSearchRef.current = initial;
      setPreviewedSearch(initial);
      setSearch(initial);
      setSearchReady(true);
    }
    sync();
    const querySubscription = searchApi.query$.subscribe(sync);
    const filtersSubscription = searchApi.filters$.subscribe(sync);
    return () => {
      querySubscription.unsubscribe();
      filtersSubscription.unsubscribe();
    };
  }, [searchApi]);

  const openedSearch = openedSearchRef.current ?? emptySearch;
  const searchChanged = searchReady && !sameSearch(search, openedSearch);
  const searchUnpreviewed = searchReady && !sameSearch(search, previewedSearch);
  const canPreview = spec !== previewedSpec || searchUnpreviewed;
  const canSave = isNewPanel || spec !== initialEditorValue || searchChanged;
  const previewChanges = () => {
    onPreview(specFromEditor(spec, format));
    setPreviewedSpec(spec);
    setPreviewedSearch(search);
  };

  // Revert on unmount unless the user saved. A ref holds the latest callback without re-arming the
  // unmount effect; `saved` suppresses the revert after a successful Save.
  const saved = useRef(false);
  const onRevertRef = useRef(onRevert);
  onRevertRef.current = onRevert;
  useEffect(
    () => () => {
      if (!saved.current) {
        onRevertRef.current();
      }
    },
    []
  );

  const handleSave = () => {
    saved.current = true;
    menuManager.commitSession();
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
      <EditorFlyoutBody menuManager={menuManager} SearchBar={SearchBar}>
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
            renderControls={(actions) => <VegaEditorMenu menuManager={menuManager} {...actions} />}
            editorValue={spec}
            initialFormat={initialSpec.format}
            onChange={setSpec}
            onFormatChange={setFormat}
          />
        </Suspense>
      </EditorFlyoutBody>
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
