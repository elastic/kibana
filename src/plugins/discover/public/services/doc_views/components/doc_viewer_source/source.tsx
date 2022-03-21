/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import './source.scss';

import React, { useEffect, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { monaco } from '@kbn/monaco';
import { EuiButton, EuiEmptyPrompt, EuiLoadingSpinner, EuiSpacer, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useDiscoverServices } from '../../../../utils/use_discover_services';
import { JSONCodeEditorCommonMemoized } from '../../../../components/json_code_editor/json_code_editor_common';
import { DOC_TABLE_LEGACY, SEARCH_FIELDS_FROM_SOURCE } from '../../../../../common';
import { useEsDocSearch } from '../../../../utils/use_es_doc_search';
import { DataView } from '../../../../../../data_views/public';
import { ElasticRequestState } from '../../../../application/doc/types';
import { getHeight } from './get_height';

interface SourceViewerProps {
  id: string;
  index: string;
  indexPattern: DataView;
  hasLineNumbers: boolean;
  width?: number;
}

// Ihe number of lines displayed without scrolling used for classic table, which renders the component
// inline limitation was necessary to enable virtualized scrolling, which improves performance
export const MAX_LINES_CLASSIC_TABLE = 500;
// Displayed margin of the code editor to the window bottom when rendered in the document explorer flyout
export const MARGIN_BOTTOM = 25;

export const DocViewerSource = ({
  id,
  index,
  indexPattern,
  width,
  hasLineNumbers,
}: SourceViewerProps) => {
  const [editor, setEditor] = useState<monaco.editor.IStandaloneCodeEditor>();
  const [jsonValue, setJsonValue] = useState<string>('');
  const { uiSettings } = useDiscoverServices();
  const useNewFieldsApi = !uiSettings.get(SEARCH_FIELDS_FROM_SOURCE);
  const useDocExplorer = !uiSettings.get(DOC_TABLE_LEGACY);
  const [reqState, hit, requestData] = useEsDocSearch({
    id,
    index,
    indexPattern,
    requestSource: useNewFieldsApi,
  });

  useEffect(() => {
    if (reqState === ElasticRequestState.Found && hit) {
      setJsonValue(JSON.stringify(hit, undefined, 2));
    }
  }, [reqState, hit]);

  // setting editor height based on lines height and count to stretch and fit its content
  useEffect(() => {
    if (!editor) {
      return;
    }
    const editorElement = editor.getDomNode();

    if (!editorElement) {
      return;
    }

    const height = getHeight(editor, useDocExplorer);
    if (height === 0) {
      return;
    }

    if (!jsonValue || jsonValue === '') {
      editorElement.style.height = '0px';
    } else {
      editorElement.style.height = `${height}px`;
    }
    editor.layout();
  }, [editor, jsonValue, useDocExplorer]);

  const loadingState = (
    <div className="sourceViewer__loading">
      <EuiLoadingSpinner className="sourceViewer__loadingSpinner" />
      <EuiText size="xs" color="subdued">
        <FormattedMessage id="discover.loadingJSON" defaultMessage="Loading JSON" />
      </EuiText>
    </div>
  );

  const errorMessageTitle = (
    <h2>
      {i18n.translate('discover.sourceViewer.errorMessageTitle', {
        defaultMessage: 'An Error Occurred',
      })}
    </h2>
  );
  const errorMessage = (
    <div>
      {i18n.translate('discover.sourceViewer.errorMessage', {
        defaultMessage: 'Could not fetch data at this time. Refresh the tab to try again.',
      })}
      <EuiSpacer size="s" />
      <EuiButton iconType="refresh" onClick={requestData}>
        {i18n.translate('discover.sourceViewer.refresh', {
          defaultMessage: 'Refresh',
        })}
      </EuiButton>
    </div>
  );
  const errorState = (
    <EuiEmptyPrompt iconType="alert" title={errorMessageTitle} body={errorMessage} />
  );

  if (reqState === ElasticRequestState.Error || reqState === ElasticRequestState.NotFound) {
    return errorState;
  }

  if (reqState === ElasticRequestState.Loading || jsonValue === '') {
    return loadingState;
  }

  return (
    <JSONCodeEditorCommonMemoized
      jsonValue={jsonValue}
      width={width}
      hasLineNumbers={hasLineNumbers}
      onEditorDidMount={(editorNode: monaco.editor.IStandaloneCodeEditor) => setEditor(editorNode)}
    />
  );
};
