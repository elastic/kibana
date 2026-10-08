/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { EuiFlyoutBody, EuiFlyoutHeader, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { DataView } from '@kbn/data-views-plugin/public';
import {
  COMPARE_ALL_OPTIONS,
  compareFilters,
  isOfQueryType,
  type Filter,
  type Query,
} from '@kbn/es-query';
import { ManagedEditorFooter } from '@kbn/presentation-util-plugin/public';
import { useBatchedPublishingSubjects } from '@kbn/presentation-publishing';
import { isEqual } from 'lodash';
import type { VegaByValueState } from '../../server';
import type { VegaPluginStartDependencies } from '../plugin';
import { VegaEditorBody, vegaEditorFlyoutBodyCss } from '../components/vega_editor_body';
import { specFromEditor, specToEditorValue } from '../lib/editor_spec';
import { vegaTitleInWizard } from '../vega_icon';
import type { VegaEmbeddableApi } from './vega_embeddable';

interface PanelSearch {
  query?: Query;
  filters?: Filter[];
}

const sameSearch = (left: PanelSearch, right: PanelSearch): boolean =>
  isEqual(left.query, right.query) &&
  compareFilters(left.filters ?? [], right.filters ?? [], COMPARE_ALL_OPTIONS);

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
  const initialEditorValue = specToEditorValue(initialSpec);
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
  const search = useMemo<PanelSearch>(
    () => ({
      query: isOfQueryType(publishedQuery) ? publishedQuery : undefined,
      filters: publishedFilters,
    }),
    [publishedFilters, publishedQuery]
  );
  const initialSearch = useMemo<PanelSearch>(() => {
    const initialQuery = api.query$.getValue();
    return {
      query: isOfQueryType(initialQuery) ? initialQuery : undefined,
      filters: api.filters$.getValue(),
    };
  }, [api]);
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
      <EuiFlyoutBody data-test-subj="editorFlyoutBody" css={vegaEditorFlyoutBodyCss}>
        <VegaEditorBody
          SearchBar={SearchBar}
          dataViews={dataViews}
          query={search.query}
          filters={search.filters}
          onQueryChange={api.setQuery}
          onFiltersChange={api.setFilters}
          spec={spec}
          initialFormat={initialSpec.format}
          onSpecChange={setSpec}
          onFormatChange={setFormat}
        />
      </EuiFlyoutBody>
      <ManagedEditorFooter
        onCancel={closeFlyout}
        cancelButtonDataTestSubj="vegaEditorFlyoutCancelButton"
        previewAction={{
          onPreview: previewChanges,
          isEnabled: canPreview,
          'data-test-subj': 'vegaEditorFlyoutPreviewButton',
        }}
        onSave={handleSave}
        saveButtonLabel={i18n.translate('visTypeVega.dashboard.applyAndCloseButtonLabel', {
          defaultMessage: 'Apply and close',
        })}
        isSaveDisabled={!canSave}
        saveButtonDataTestSubj="vegaEditorFlyoutSaveButton"
      />
    </>
  );
};
