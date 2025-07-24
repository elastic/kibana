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
import { mutate, type ESQLSource, BasicPrettyPrinter } from '@kbn/esql-ast';
import { Parser } from '@kbn/esql-ast';
import { memoize } from 'lodash';
import { IndexAutocompleteItem } from '@kbn/esql-types';
import { i18n } from '@kbn/i18n';
import type { ESQLEditorDeps } from '../types';

/**
 * Replace the index referenced by the JOIN that the user created.
 *
 * @param query             - full ES|QL query
 * @param initialIndexOrPos - either the index name we want to replace OR a Monaco
 *                            cursor Position pointing at that name
 * @param createdIndexName – new lookup-index name
 *
 * @returns {string} Query with appended index name to the join command
 */
export function appendIndexToJoinCommand(
  query: string,
  initialIndexOrPos: string | monaco.Position,
  createdIndexName: string
): string {
  if (!createdIndexName) return query; // nothing to do

  // Resolve the “target” index name
  let targetName: string | undefined;

  if (typeof initialIndexOrPos === 'string') {
    targetName = initialIndexOrPos.trim();
  }

  // If we came through name-path and it equals new name – nothing to do
  if (typeof initialIndexOrPos === 'string' && targetName === createdIndexName) {
    return query;
  }

  // Parse and walk the AST
  const { root } = Parser.parse(query);

  // Compute cursor offset once (if needed)
  const cursorOffset: number | undefined =
    typeof initialIndexOrPos === 'object'
      ? (() => {
          const { lineNumber, column } = initialIndexOrPos;
          const lines = query.split('\n');
          let off = 0;
          for (let i = 0; i < lineNumber - 1; i++) {
            off += lines[i].length + 1;
          }
          return off + column - 1;
        })()
      : undefined;

  // Pick the JOIN command to modify
  let selectedJoin: any | undefined;
  let smallestDistance = Number.MAX_SAFE_INTEGER;

  for (const joinCmd of mutate.commands.join.list(root)) {
    const firstArg = joinCmd.args[0] as any | undefined; // may be undefined
    let src: ESQLSource | undefined;

    if (firstArg?.type === 'source') {
      src = firstArg;
    } else if (firstArg?.type === 'as') {
      src = firstArg.args[0] as ESQLSource; // AS (<source>, <alias>)
    }

    const matchesByName = targetName !== undefined && src?.name === targetName;

    if (matchesByName) {
      selectedJoin = { joinCmd, src, firstArg };
      break;
    }

    if (cursorOffset !== undefined && joinCmd.location) {
      const { min, max } = joinCmd.location;
      let distance = 0;
      if (cursorOffset < min) distance = min - cursorOffset;
      else if (cursorOffset > max) distance = cursorOffset - max;

      if (distance < smallestDistance) {
        smallestDistance = distance;
        selectedJoin = { joinCmd, src, firstArg };
      }
    }
  }

  if (!selectedJoin) return query; // no join found

  const { joinCmd, src, firstArg } = selectedJoin;

  // If existing source already equals new name, nothing to do
  if (src && src.name === createdIndexName) return query;

  const newSource: ESQLSource = {
    type: 'source',
    sourceType: 'index',
    incomplete: false,
    location: src?.location ?? {
      min: joinCmd.location?.min ?? 0,
      max: (joinCmd.location?.min ?? 0) + createdIndexName.length,
    },
    text: createdIndexName,
    name: createdIndexName,
  };

  if (src) {
    const idx = joinCmd.args.indexOf(firstArg);
    mutate.generic.commands.args.remove(root as any, firstArg);
    mutate.generic.commands.args.insert(joinCmd, newSource, idx);
  } else {
    mutate.generic.commands.args.insert(joinCmd, newSource, 0);
  }

  return BasicPrettyPrinter.multiline(root);
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
      white-space: nowrap;
      text-decoration: none;
      border-radius: ${euiTheme.border.radius.small};
      text-align: start;
      border-width: ${euiTheme.border.thin};
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
    (initialIndexName: string | undefined, resultIndexName: string, indexCreated: boolean) => {
      console.log(initialIndexName, '___initialIndexName___');
      console.log(resultIndexName, '___resultIndexName___');
      console.log(indexCreated, '___indexCreated___');

      if (!indexCreated) return;

      const cursorPosition = editorRef.current?.getPosition();

      console.log(cursorPosition, '___cursorPosition___');

      if (!initialIndexName && !cursorPosition) {
        throw new Error('Could not find cursor position in the editor');
      }

      const resultQuery = appendIndexToJoinCommand(
        query.esql,
        initialIndexName || cursorPosition!,
        resultIndexName
      );
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
          onFlyoutClose(indexName, resultIndexName, indexCreatedDuringFlyout);
        },
      } as EditLookupIndexContentContext);
    },
    [onFlyoutClose, uiActions]
  );

  monaco.editor.registerCommand(
    'esql.lookup_index.create',
    async (_, args: { indexName: string; doesIndexExist?: boolean }) => {
      const { indexName, doesIndexExist } = args;
      await openFlyout(indexName, doesIndexExist);
    }
  );

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
                hoverMessage: {
                  value: `[${
                    isExistingIndex
                      ? i18n.translate('esqlEditor.lookupIndex.edit', {
                          defaultMessage: 'Edit lookup index',
                        })
                      : i18n.translate('esqlEditor.lookupIndex.create', {
                          defaultMessage: 'Create lookup index',
                        })
                  }](command:esql.lookup_index.create?${encodeURIComponent(
                    JSON.stringify({ indexName: lookupIndex, doesIndexExist: isExistingIndex })
                  )})`,
                  isTrusted: true,
                },

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
