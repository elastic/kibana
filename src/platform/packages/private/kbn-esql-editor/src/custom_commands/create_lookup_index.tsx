/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback } from 'react';
import { monaco } from '@kbn/monaco';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiLink } from '@elastic/eui';
import { EditLookupIndexContentContext } from '@kbn/index-editor';
import { i18n } from '@kbn/i18n';
import type { AggregateQuery } from '@kbn/es-query';
import type { ESQLEditorDeps } from '../types';

/**
 * Returns a query with appended index name to the join command.
 *
 * @param query Input query
 * @param cursorPosition
 * @param indexName
 *
 * @returns {string} Query with appended index name to the join command
 */
export function appendIndexToJoinCommand(
  query: string,
  cursorPosition: monaco.Position,
  indexName: string
): string {
  const cursorColumn = cursorPosition?.column ?? 1;
  const cursorLine = cursorPosition?.lineNumber ?? 1;

  const lines = query.split('\n');
  const line = lines[cursorLine - 1];

  let beforeCursor = line.slice(0, cursorColumn - 1);
  const afterCursor = line.slice(cursorColumn - 1);

  // Check if the join command already had an index argument.
  // Delete the last word before the cursor
  beforeCursor = beforeCursor.replace(/\S+$/, '');

  const updatedLine = beforeCursor + indexName + afterCursor;
  lines[cursorLine - 1] = updatedLine;

  return lines.join('\n');
}

export const useLookupIndexCommand = (
  editor: monaco.editor.IStandaloneCodeEditor,
  query: AggregateQuery,
  onIndexCreated: (resultQuery: string) => void
) => {
  const kibana = useKibana<ESQLEditorDeps>();
  const { uiActions, docLinks } = kibana.services;

  const onUploadComplete = useCallback(
    (results: FileUploadResults) => {
      const cursorPosition = editor.getPosition();

      if (!cursorPosition) {
        throw new Error('Could not find cursor position in the editor');
      }

      const resultQuery = appendIndexToJoinCommand(query.esql, cursorPosition, results.index);
      onIndexCreated(resultQuery);
    },
    [onIndexCreated, query.esql, editor]
  );

  // TODO: Replace with the actual lookup index docs URL once it's available
  const lookupIndexDocsUrl = docLinks?.links.apis.createIndex;

  monaco.editor.registerCommand('esql.lookup_index.create', async (_, initialIndexName) => {
    await uiActions.getTrigger('EDIT_LOOKUP_INDEX_CONTENT_TRIGGER_ID').exec({
      initialIndexName,
      onUploadComplete,
      onClose: () => {},
      onSave: () => {},
    } as EditLookupIndexContentContext);
  });
};
