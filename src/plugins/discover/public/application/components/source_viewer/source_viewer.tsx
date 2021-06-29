/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import './source_viewer.scss';

import React, { useEffect, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { monaco } from '@kbn/monaco';
import { EuiButton, EuiEmptyPrompt, EuiLoadingSpinner, EuiSpacer, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useEsDocSearch } from '../doc/use_es_doc_search';
import { JSONCodeEditorCommonMemoized } from '../json_code_editor/json_code_editor_common';
import { ElasticRequestState } from '../doc/elastic_request_state';
import { getServices } from '../../../../public/kibana_services';
import { SEARCH_FIELDS_FROM_SOURCE } from '../../../../common';

interface SourceViewerProps {
  id: string;
  index: string;
  indexPatternId: string;
  hasLineNumbers: boolean;
  width?: number;
}

export const SourceViewer = ({
  id,
  index,
  indexPatternId,
  width,
  hasLineNumbers,
}: SourceViewerProps) => {
  const [editor, setEditor] = useState<monaco.editor.IStandaloneCodeEditor>();
  const [jsonValue, setJsonValue] = useState<string>('');
  const indexPatternService = getServices().data.indexPatterns;
  const useNewFieldsApi = !getServices().uiSettings.get(SEARCH_FIELDS_FROM_SOURCE);
  const [reqState, hit, , requestData] = useEsDocSearch({
    id,
    index,
    indexPatternId,
    indexPatternService,
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

    const lineHeight = editor.getOption(monaco.editor.EditorOption.lineHeight);
    const lineCount = editor.getModel()?.getLineCount() || 1;
    const height = editor.getTopForLineNumber(lineCount + 1) + lineHeight;
    if (!jsonValue || jsonValue === '') {
      editorElement.style.height = '0px';
    } else {
      editorElement.style.height = `${height}px`;
    }
    editor.layout();
  }, [editor, jsonValue]);

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

  if (
    reqState === ElasticRequestState.Error ||
    reqState === ElasticRequestState.NotFound ||
    reqState === ElasticRequestState.NotFoundIndexPattern
  ) {
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
