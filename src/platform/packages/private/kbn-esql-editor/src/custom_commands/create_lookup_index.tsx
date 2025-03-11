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
import type { FileUploadResults, OpenFileUploadLiteContext } from '@kbn/file-upload-common';
import { i18n } from '@kbn/i18n';
import type { AggregateQuery } from '@kbn/es-query';
import { parse, mutate, BasicPrettyPrinter, ESQLSource } from '@kbn/esql-ast';
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
  const { root } = parse(query);

  // it could be several join command in the query, hence we need
  // to find the correct one to append the index name

  const cursorColumn = cursorPosition?.column ?? 0;
  const cursorLine = cursorPosition?.lineNumber ?? 0;

  const joinCommand = mutate.commands.join.byIndex(root, 0);

  if (!joinCommand) {
    throw new Error('Could not find join command in the query');
  }

  mutate.generic.commands.args.append(joinCommand, {
    type: 'source',
    sourceType: 'index',
    incomplete: false,
    location: {
      min: cursorColumn,
      max: cursorColumn + indexName.length,
    },
    text: indexName,
    name: indexName,
  } as ESQLSource);

  const resultQuery = BasicPrettyPrinter.print(root);

  return resultQuery;
}

export const useCreateLookupIndexCommand = (
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

  monaco.editor.registerCommand('esql.control.lookup_index.create', async (_, initialIndexName) => {
    await uiActions.getTrigger('OPEN_FILE_UPLOAD_LITE_TRIGGER').exec({
      onUploadComplete,
      autoCreateDataView: false,
      initialIndexName,
      indexSettings: {
        'index.mode': 'lookup',
      },
      flyoutContent: {
        showFileSummary: true,
        showFileContentPreview: true,
        title: i18n.translate('esqlEditor.lookupJoin.title', {
          defaultMessage: 'Create lookup index',
        }),
        description: (
          <FormattedMessage
            id="esqlEditor.lookupJoin.description"
            defaultMessage={
              'Lookup indices can be created by uploading data from a file, below, or through the {docUrl}.'
            }
            values={{
              docUrl: (
                <EuiLink
                  href={docLinks?.links.apis.createIndex}
                  target="_blank"
                  rel="noopener nofollow noreferrer"
                  data-test-subj="lookupIndexDocLink"
                >
                  <FormattedMessage
                    id="esqlEditor.lookupJoin.docUrl"
                    defaultMessage={'Elasticsearch API'}
                  />
                </EuiLink>
              ),
            }}
          />
        ),
      },
    } as OpenFileUploadLiteContext);
  });
};
