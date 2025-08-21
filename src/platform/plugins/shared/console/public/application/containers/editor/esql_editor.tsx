/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import dateMath from '@kbn/datemath';
import React, { useCallback, useRef, useState } from 'react';
import { EuiSuperDatePicker } from '@elastic/eui';
import type { monaco } from '@kbn/monaco';
import { css } from '@emotion/react';
import { ESQLLangEditor } from '@kbn/esql/public';
import type { AggregateQuery } from '@kbn/es-query';
import { EsqlEditorActionsProvider } from './esql_editor_actions_provider';
import { useServicesContext, useRequestActionContext } from '../../contexts';

const INITIAL_TEXT =
  '// Welcome to ES|QL Console!\n\n// Send ES|QL queries to search, aggregate, and visualize your data.\n// Here are a few examples to get you started:\n\n// Retrieve data\nFROM kibana_sample_data_ecommerce | LIMIT 10';

export const EsqlEditor = () => {
  const context = useServicesContext();
  const divRef = useRef<HTMLDivElement | null>(null);

  const dispatch = useRequestActionContext();

  const actionsProvider = useRef<EsqlEditorActionsProvider | null>(null);
  const [text, setText] = useState<string>(INITIAL_TEXT);
  const query = actionsProvider.current?.getCurrentQuery() ?? '';
  const [timeRange, setTimeRange] = useState<{ start: string; end: string }>({
    start: 'now-15m',
    end: 'now',
  });
  console.log(timeRange);

  const editorDidMountCallback = useCallback((editor: monaco.editor.IStandaloneCodeEditor) => {
    const provider = new EsqlEditorActionsProvider(editor);
    actionsProvider.current = provider;
  }, []);

  const sendRequestsCallback = useCallback(async () => {
    await actionsProvider.current?.sendQueries(dispatch, context, {
      start: dateMath.parse(timeRange.start)?.toISOString() ?? '',
      end: dateMath.parse(timeRange.end)?.toISOString() ?? '',
    });
  }, [dispatch, context, timeRange]);

  return (
    <div
      css={css`
        width: 100%;
        height: 100%;
      `}
      ref={divRef}
    >
      <ESQLLangEditor
        text={text}
        onTextChange={setText}
        query={{ esql: query }}
        onTextLangQueryChange={(q: AggregateQuery) => {}}
        barElement={
          <EuiSuperDatePicker
            showUpdateButton={false}
            onTimeChange={(range) => {
              setTimeRange({ start: range.start, end: range.end });
            }}
            start={timeRange?.start}
            end={timeRange?.end}
            width="auto"
            compressed={true}
            dateFormat={'MMM D, YYYY @ HH:mm:ss.SSS'}
            timeFormat="absolute"
          />
        }
        onTextLangQuerySubmit={() => sendRequestsCallback()}
        expandToFitQueryOnMount={true}
        hasOutline={true}
        editorIsInline={true}
        hideTimeFilterInfo={true}
        customEditorDidMount={editorDidMountCallback}
        fullHeight={true}
        hideRunQueryText={true}
        allowQueryCancellation={true}
        allowQueryRefresh={false}
        runQueryButtonText="Run selected queries"
      />
    </div>
  );
};
