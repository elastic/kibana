/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AggregateQuery } from '@kbn/es-query';
import { EditLookupIndexContentContext } from '@kbn/index-editor';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { monaco } from '@kbn/monaco';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { css } from '@emotion/react';
import { useEuiTheme } from '@elastic/eui';
import { type ESQLSource } from '@kbn/esql-ast';
import { Parser } from '@kbn/esql-ast/src/parser/parser';
import { memoize } from 'lodash';
import { IndexAutocompleteItem } from '@kbn/esql-types';
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

function isESQLSourceItem(arg: unknown): arg is ESQLSource {
  return typeof arg === 'object' && arg !== null && 'type' in arg && arg.type === 'source';
}

/**
 * Hook to register a custom command and tokens for lookup indices in the ESQL editor.
 * @param editorRef
 * @param editorModel
 * @param getLookupIndices
 * @param query
 * @param onIndexCreated
 */
export const useLookupIndexCommand = (
  editorRef: React.MutableRefObject<monaco.editor.IStandaloneCodeEditor | undefined>,
  editorModel: React.MutableRefObject<monaco.editor.ITextModel | undefined>,
  getLookupIndices: (() => Promise<{ indices: IndexAutocompleteItem[] }>) | undefined,
  query: AggregateQuery,
  onIndexCreated: (resultQuery: string) => void
) => {
  const { euiTheme } = useEuiTheme();
  const inQueryLookupIndices = useRef<string[]>([]);

  const lookupIndexBaseBadgeClassName = 'lookupIndexBadge';
  const lookupIndexAddBadgeClassName = 'lookupIndexAddBadge';
  const lookupIndexEditBadgeClassName = 'lookupIndexEditBadge';

  const lookupIndexBadgeStyle = css`
    .${lookupIndexBaseBadgeClassName} {
      cursor: pointer;
      display: inline-block;
      vertical-align: middle;
      padding-block: 0px;
      padding-inline: 2px;
      max-inline-size: 100%;
      font-size: 0.8571rem;
      line-height: 18px;
      font-weight: 500;
      white-space: nowrap;
      text-decoration: none;
      border-radius: 3px;
      text-align: start;
      border-width: 1px;
      border-style: solid;
      color: ${euiTheme.colors.text};
    }
    .${lookupIndexAddBadgeClassName} {
      border-color: ${euiTheme.colors.backgroundBaseDanger};
      background-color: ${euiTheme.colors.backgroundBaseDanger};
    }
    .${lookupIndexEditBadgeClassName} {
      border-color: ${euiTheme.colors.backgroundBasePrimary};
      background-color: ${euiTheme.colors.backgroundBasePrimary};
    }
  `;

  const kibana = useKibana<ESQLEditorDeps>();
  const { uiActions, docLinks } = kibana.services;

  useEffect(
    function parseIndicesOnChange() {
      const indexNames: string[] = [];

      // parse esql query and find lookup indices in the query, traversing the AST
      const { root } = Parser.parse(query.esql);
      // find all join commands
      root.commands.forEach((command) => {
        if (command.name === 'join') {
          const indexName = command.args.find<ESQLSource>(isESQLSourceItem);
          if (indexName) {
            indexNames.push(indexName.name);
          }
        }
      });

      inQueryLookupIndices.current = indexNames;
    },
    [query.esql]
  );

  const onFlyoutClose = useCallback(
    (resultIndexName: string, indexCreated: boolean) => {
      if (!indexCreated) return;

      const cursorPosition = editorRef.current?.getPosition();

      if (!cursorPosition) {
        throw new Error('Could not find cursor position in the editor');
      }

      const resultQuery = appendIndexToJoinCommand(query.esql, cursorPosition, resultIndexName);
      onIndexCreated(resultQuery);
    },
    [onIndexCreated, query.esql, editorRef]
  );

  // TODO: Replace with the actual lookup index docs URL once it's available
  // @ts-ignore
  const lookupIndexDocsUrl = docLinks?.links.apis.createIndex;

  const openFlyout = useCallback(
    async (indexName: string, doesIndexExist?: boolean) => {
      await uiActions.getTrigger('EDIT_LOOKUP_INDEX_CONTENT_TRIGGER_ID').exec({
        indexName,
        doesIndexExist,
        onClose: ({ indexName: resultIndexName, indexCreatedDuringFlyout }) => {
          onFlyoutClose(resultIndexName, indexCreatedDuringFlyout);
        },
      } as EditLookupIndexContentContext);
    },
    [onFlyoutClose, uiActions]
  );

  monaco.editor.registerCommand('esql.lookup_index.create', async (_, indexName) => {
    await openFlyout(indexName, false);
  });

  const getLookupIndicesMemoized = useMemo(
    () => memoize(getLookupIndices ?? (() => Promise.resolve({ indices: [] }))),
    [getLookupIndices]
  );

  const addLookupIndicesDecorator = useCallback(() => {
    // we need to remove the previous decorations first
    const lineCount = editorModel.current?.getLineCount() || 1;
    for (let i = 1; i <= lineCount; i++) {
      const decorations = editorRef.current?.getLineDecorations(i) ?? [];
      editorRef?.current?.removeDecorations(decorations.map((d) => d.id));
    }

    getLookupIndicesMemoized().then(({ indices: existingIndices }) => {
      // TODO extract aliases as well
      const lookupIndices: string[] = inQueryLookupIndices.current;

      for (let i = 0; i < lookupIndices.length; i++) {
        const lookupIndex = lookupIndices[i];

        const isExistingIndex = existingIndices.some((index) => index.name === lookupIndex);

        const matches =
          editorModel.current?.findMatches(lookupIndex, true, false, true, ' ', true) || [];

        matches.forEach((match) => {
          const range = new monaco.Range(
            match.range.startLineNumber,
            match.range.startColumn,
            match.range.endLineNumber,
            match.range.endColumn
          );

          editorRef?.current?.createDecorationsCollection([
            {
              range,
              options: {
                isWholeLine: false,
                stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
                inlineClassName:
                  lookupIndexBaseBadgeClassName +
                  ' ' +
                  (isExistingIndex ? lookupIndexEditBadgeClassName : lookupIndexAddBadgeClassName),
              },
            },
          ]);
        });
      }
    });
  }, [editorModel, getLookupIndicesMemoized, editorRef]);

  useEffect(
    function updateOnQueryChange() {
      addLookupIndicesDecorator();
    },
    [query.esql, addLookupIndicesDecorator]
  );

  /**
   * the onClick handler is set only once, hence the reference has to be stable.
   */
  const lookupIndexLabelClickHandler = useCallback(
    async (e: monaco.editor.IEditorMouseEvent) => {
      const mousePosition = e.target.position;
      if (!mousePosition) return;

      const currentWord = editorModel.current?.getWordAtPosition(mousePosition);
      const clickedIndexName = inQueryLookupIndices.current.find((v) =>
        currentWord?.word.includes(v)
      );

      const doesIndexExist = (await getLookupIndicesMemoized()).indices.some(
        (index) => index.name === clickedIndexName
      );

      if (clickedIndexName) {
        await openFlyout(clickedIndexName, doesIndexExist);
      }
    },
    [editorModel, getLookupIndicesMemoized, openFlyout]
  );

  return {
    addLookupIndicesDecorator,
    lookupIndexBadgeStyle,
    lookupIndexLabelClickHandler,
  };
};
