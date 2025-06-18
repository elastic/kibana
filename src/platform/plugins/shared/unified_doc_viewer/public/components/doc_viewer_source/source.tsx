/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useState } from 'react';
import { css } from '@emotion/react';
import { omit } from 'lodash';
import { FormattedMessage } from '@kbn/i18n-react';
import { monaco } from '@kbn/monaco';
import { EuiButton, EuiEmptyPrompt, EuiLoadingSpinner, EuiSpacer, EuiText } from '@elastic/eui';
import { euiThemeVars } from '@kbn/ui-theme';
import { i18n } from '@kbn/i18n';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { DataTableRecord } from '@kbn/discover-utils/types';
import { ElasticRequestState } from '@kbn/unified-doc-viewer';
import { isLegacyTableEnabled, SEARCH_FIELDS_FROM_SOURCE } from '@kbn/discover-utils';
import { getUnifiedDocViewerServices } from '../../plugin';
import { useEsDocSearch } from '../../hooks';
import { getHeight, DEFAULT_MARGIN_BOTTOM } from './get_height';
import { JSONCodeEditorCommonMemoized } from '../json_code_editor';

interface SourceViewerProps {
  id: string;
  index: string | undefined;
  dataView: DataView;
  esqlHit?: DataTableRecord;
  width?: number;
  decreaseAvailableHeightBy?: number;
  onRefresh: () => void;
}

// Ihe number of lines displayed without scrolling used for classic table, which renders the component
// inline limitation was necessary to enable virtualized scrolling, which improves performance
export const MAX_LINES_CLASSIC_TABLE = 500;
// Minimum height for the source content to guarantee minimum space when the flyout is scrollable.
export const MIN_HEIGHT = 400;

export const DocViewerSource = ({
  id,
  index,
  dataView,
  esqlHit,
  width,
  decreaseAvailableHeightBy,
  onRefresh,
}: SourceViewerProps) => {
  const [editor, setEditor] = useState<monaco.editor.IStandaloneCodeEditor>();
  const [editorHeight, setEditorHeight] = useState<number>();
  const [jsonValue, setJsonValue] = useState<string>('');
  const { uiSettings } = getUnifiedDocViewerServices();
  const useNewFieldsApi = !uiSettings.get(SEARCH_FIELDS_FROM_SOURCE);
  const useDocExplorer = !isLegacyTableEnabled({
    uiSettings,
    isEsqlMode: Boolean(esqlHit),
  });
  const [requestState, hit] = useEsDocSearch({
    id,
    index,
    dataView,
    requestSource: useNewFieldsApi,
    esqlHit,
  });

  useEffect(() => {
    if (requestState === ElasticRequestState.Found && hit) {
      setJsonValue(JSON.stringify(omit(hit.raw, '_score'), undefined, 2));
    }
  }, [requestState, hit]);

  // setting editor height
  // - classic view: based on lines height and count to stretch and fit its content
  // - explorer: to fill the available space of the document flyout
  useEffect(() => {
    if (!editor) {
      return;
    }
    const editorElement = editor.getDomNode();

    if (!editorElement) {
      return;
    }

    const height = getHeight(
      editor,
      useDocExplorer,
      decreaseAvailableHeightBy ?? DEFAULT_MARGIN_BOTTOM
    );
    if (height === 0) {
      return;
    }

    if (!jsonValue || jsonValue === '') {
      setEditorHeight(0);
    } else {
      setEditorHeight(height);
    }
  }, [editor, jsonValue, useDocExplorer, setEditorHeight, decreaseAvailableHeightBy]);

  const loadingState = (
    <div css={styles.loading}>
      <EuiLoadingSpinner css={styles.loadingSpinner} />
      <EuiText size="xs" color="subdued">
        <FormattedMessage id="unifiedDocViewer.loadingJSON" defaultMessage="Loading JSON" />
      </EuiText>
    </div>
  );

  const errorMessageTitle = (
    <h2>
      {i18n.translate('unifiedDocViewer.sourceViewer.errorMessageTitle', {
        defaultMessage: 'An Error Occurred',
      })}
    </h2>
  );
  const errorMessage = (
    <div>
      {i18n.translate('unifiedDocViewer.sourceViewer.errorMessage', {
        defaultMessage: 'Could not fetch data at this time. Refresh the tab to try again.',
      })}
      <EuiSpacer size="s" />
      <EuiButton iconType="refresh" onClick={onRefresh}>
        {i18n.translate('unifiedDocViewer.sourceViewer.refresh', {
          defaultMessage: 'Refresh',
        })}
      </EuiButton>
    </div>
  );
  const errorState = (
    <EuiEmptyPrompt iconType="warning" title={errorMessageTitle} body={errorMessage} />
  );

  if (requestState === ElasticRequestState.Error || requestState === ElasticRequestState.NotFound) {
    return errorState;
  }

  if (requestState === ElasticRequestState.Loading || jsonValue === '') {
    return loadingState;
  }

  return (
    <JSONCodeEditorCommonMemoized
      jsonValue={jsonValue}
      width={width}
      height={editorHeight}
      hasLineNumbers
      enableFindAction
      onEditorDidMount={(editorNode: monaco.editor.IStandaloneCodeEditor) => setEditor(editorNode)}
    />
  );
};

const styles = {
  loading: css({
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'left',
    flex: '1 0 100%',
    textAlign: 'center',
    height: '100%',
    width: '100%',
    marginTop: euiThemeVars.euiSizeS,
  }),
  loadingSpinner: css({
    marginRight: euiThemeVars.euiSizeS,
  }),
};
