/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AggregateQuery } from '@kbn/es-query';
import type { EditLookupIndexContentContext } from '@kbn/index-editor';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { monaco } from '@kbn/monaco';
import type React from 'react';
import { useCallback, useEffect, useRef } from 'react';
import { css } from '@emotion/react';
import { useEuiTheme } from '@elastic/eui';
import {
  BasicPrettyPrinter,
  type ESQLAstItem,
  type ESQLAstJoinCommand,
  type ESQLSingleAstItem,
  type ESQLSource,
  mutate,
  Parser,
  isSource,
} from '@kbn/esql-ast';
import type { IndexAutocompleteItem } from '@kbn/esql-types';
import { i18n } from '@kbn/i18n';
import { isEqual, memoize } from 'lodash';
import { useDebounceFn } from '@kbn/react-hooks';
import type { ESQLEditorDeps } from '../types';

/**
 * Replace the index name in a join command.
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

  // If we came through name-path, and it equals new name – nothing to do
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
  let selectedJoin:
    | { joinCmd: ESQLAstJoinCommand; src: ESQLSource | undefined; firstArg: ESQLAstItem }
    | undefined;
  let smallestDistance = Number.MAX_SAFE_INTEGER;

  for (const joinCmd of mutate.commands.join.list(root)) {
    const firstArg = joinCmd.args[0]; // may be undefined
    let src: ESQLSource | undefined;

    if (isSource(firstArg)) {
      src = firstArg;
    } else if (!Array.isArray(firstArg) && firstArg.type === 'option' && firstArg.name === 'as') {
      // "AS" clause: first argument is the underlying source
      src = firstArg.args[0] as unknown as ESQLSource; // AS (<source>, <alias>)
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
    // remove the original argument (source or AS option) from the JOIN command
    mutate.generic.commands.args.remove(root, firstArg as unknown as ESQLSingleAstItem);
    mutate.generic.commands.args.insert(joinCmd, newSource, idx);
  } else {
    mutate.generic.commands.args.insert(joinCmd, newSource, 0);
  }

  return BasicPrettyPrinter.multiline(root);
}

export type IndexPrivileges = Record<
  string,
  { read: boolean; write: boolean; create_index: boolean }
>;

/**
 * Extracts and returns a list of unique lookup indices from the provided ESQL query by parsing the query and traversing its AST.
 *
 * @param {string} esqlQuery - The ESQL query string to parse and analyze for lookup indices.
 * @return {string[]} An array of unique lookup index names found in the query.
 */
export function getLookupIndicesFromQuery(esqlQuery: string): string[] {
  const indexNames: string[] = [];

  // parse esql query and find lookup indices in the query, traversing the AST
  const { root } = Parser.parse(esqlQuery);
  // find all join commands
  root.commands.forEach((command) => {
    if (command.name === 'join') {
      const indexName = command.args.find<ESQLSource>(isSource);
      if (indexName) {
        indexNames.push(indexName.name);
      }
    }
  });

  return Array.from(new Set(indexNames));
}

/** Helper to determine if a privilege is granted either globally (*) or for the specific index */
const hasPrivilege = (
  privileges: IndexPrivileges,
  index: string,
  permission: keyof IndexPrivileges[string]
): boolean => !!(privileges['*']?.[permission] || privileges[index]?.[permission]);

/**
 * Hook to determine if the current user has the necessary privileges to create a lookup index.
 */
export const useCanCreateLookupIndex = () => {
  const {
    services: { http },
  } = useKibana<ESQLEditorDeps>();

  const memoizedFetchPrivileges = useRef(
    memoize(async (indexName: string) => {
      return http!.get<IndexPrivileges>(`/internal/esql/lookup_index/privileges`, {
        query: { indexName },
      });
    })
  );

  const { run } = useDebounceFn(
    async (indexName: string) => {
      try {
        const response = await memoizedFetchPrivileges.current(indexName);
        return hasPrivilege(response, indexName, 'create_index');
      } catch (e) {
        return false;
      }
    },
    { wait: 300, leading: true, trailing: false }
  );

  return run as (indexName: string) => Promise<boolean>;
};

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
  onIndexCreated: (resultQuery: string) => Promise<void>
) => {
  const { euiTheme } = useEuiTheme();
  const {
    services: { uiActions, docLinks, http },
  } = useKibana<ESQLEditorDeps>();

  const inQueryLookupIndices = useRef<string[]>([]);

  useEffect(
    function parseIndicesOnChange() {
      const updated = getLookupIndicesFromQuery(query.esql);
      if (!isEqual(updated, inQueryLookupIndices.current)) {
        inQueryLookupIndices.current = updated;
      }
    },
    [query.esql]
  );

  const getIndexPrivileges = useCallback(
    (indexName: string, indicesPrivileges: IndexPrivileges) => {
      return {
        canCreateIndex: hasPrivilege(indicesPrivileges, indexName, 'create_index'),
        canEditIndex: hasPrivilege(indicesPrivileges, indexName, 'write'),
        canReadIndex: hasPrivilege(indicesPrivileges, indexName, 'read'),
      };
    },
    []
  );

  const lookupIndexBaseBadgeClassName = 'lookupIndexBadge';
  const lookupIndexAddBadgeClassName = 'lookupIndexAddBadge';
  const lookupIndexEditBadgeClassName = 'lookupIndexEditBadge';
  const lookupIndexBadgeStyle = css`
    .${lookupIndexBaseBadgeClassName} {
      white-space: nowrap;
      text-align: start;
      color: ${euiTheme.colors.textParagraph};
    }

    .${lookupIndexAddBadgeClassName} {
    }

    .${lookupIndexEditBadgeClassName} {
      border-bottom: ${euiTheme.border.width.thick} dotted ${euiTheme.colors.textParagraph};
    }
  `;

  const memoizedFetchPrivileges = useRef(
    memoize(async (indexName: string) => {
      return http!.get<IndexPrivileges>(`/internal/esql/lookup_index/privileges`, {
        query: { indexName },
      });
    })
  );

  const fetchUserPrivileges = useCallback(async (indexNames: string[]) => {
    try {
      const response = (await Promise.all(
        indexNames.map((v) => memoizedFetchPrivileges.current(v))
      )) as Array<IndexPrivileges>;
      return response.reduce((acc, curr) => {
        return {
          ...acc,
          ...curr,
        };
      }, {} as IndexPrivileges);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error fetching user privileges:', error);
      return {};
    }
  }, []);

  // TODO: Replace with the actual lookup index docs URL once it's available
  // @ts-ignore
  const lookupIndexDocsUrl = docLinks?.links.apis.createIndex;

  monaco.editor.registerCommand(
    'esql.lookup_index.create',
    async (_, args: { indexName: string; doesIndexExist?: boolean; canEditIndex?: boolean }) => {
      const { indexName, doesIndexExist, canEditIndex } = args;
      await openFlyout(indexName, doesIndexExist, canEditIndex);
    }
  );

  /**
   * Adds decorations to the editor to indicate which lookup indices are used in the query.
   * Because we pass a callback once on mount, the reference has to be stable.
   *
   */
  const { run: addLookupIndicesDecorator } = useDebounceFn(
    async () => {
      const existingIndices = getLookupIndices ? await getLookupIndices() : { indices: [] };

      const lookupIndices: string[] = inQueryLookupIndices.current;
      const privileges = await fetchUserPrivileges(lookupIndices);

      // we need to remove the previous decorations first
      const lineCount = editorModel.current?.getLineCount() || 1;
      for (let i = 1; i <= lineCount; i++) {
        const decorations = editorRef.current?.getLineDecorations(i) ?? [];
        const lookupIndexDecorations = decorations.filter((decoration) =>
          decoration.options.inlineClassName?.includes(lookupIndexBaseBadgeClassName)
        );
        editorRef?.current?.removeDecorations(lookupIndexDecorations.map((d) => d.id));
      }

      for (let i = 0; i < lookupIndices.length; i++) {
        const lookupIndex = lookupIndices[i];

        const isExistingIndex = existingIndices.indices.some((index) => index.name === lookupIndex);
        const { canCreateIndex, canReadIndex, canEditIndex } = getIndexPrivileges(
          lookupIndex,
          privileges
        );

        const matches =
          editorModel.current?.findMatches(lookupIndex, true, false, true, ' ', true) || [];

        let actionLabel = '';
        if (isExistingIndex) {
          if (canEditIndex) {
            actionLabel = i18n.translate('esqlEditor.lookupIndex.edit', {
              defaultMessage: 'Edit lookup index',
            });
          } else if (canReadIndex) {
            actionLabel = i18n.translate('esqlEditor.lookupIndex.view', {
              defaultMessage: 'View lookup index',
            });
          }
        } else {
          if (canCreateIndex) {
            actionLabel = i18n.translate('esqlEditor.lookupIndex.create', {
              defaultMessage: 'Create lookup index',
            });
          }
        }

        // Don't add decorations if the lookup index is not found in the query'
        if (!actionLabel) continue;

        matches.forEach((match) => {
          editorRef?.current?.createDecorationsCollection([
            {
              range: match.range,
              options: {
                isWholeLine: false,
                stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
                hoverMessage: {
                  value: `[${actionLabel}](command:esql.lookup_index.create?${encodeURIComponent(
                    JSON.stringify({
                      indexName: lookupIndex,
                      doesIndexExist: isExistingIndex,
                      canEditIndex,
                    })
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
    },
    { wait: 500 }
  );

  const onFlyoutClose = useCallback(
    async (
      initialIndexName: string | undefined,
      resultIndexName: string | null,
      indexCreated: boolean
    ) => {
      if (!indexCreated || resultIndexName === null) return;

      const cursorPosition = editorRef.current?.getPosition();

      if (!initialIndexName && !cursorPosition) {
        throw new Error('Could not find a cursor position in the editor');
      }

      const resultQuery = appendIndexToJoinCommand(
        query.esql,
        initialIndexName || cursorPosition!,
        resultIndexName
      );

      await onIndexCreated(resultQuery);

      if (query.esql === resultQuery) {
        // The query might be unchanged, but the lookup index is created,
        // so we need to force an update of the lookup index decorators.
        await addLookupIndicesDecorator();
      }
    },
    [editorRef, query.esql, onIndexCreated, addLookupIndicesDecorator]
  );

  const openFlyout = useCallback(
    async (indexName: string, doesIndexExist?: boolean, canEditIndex = true) => {
      await uiActions.getTrigger('EDIT_LOOKUP_INDEX_CONTENT_TRIGGER_ID').exec({
        indexName,
        doesIndexExist,
        canEditIndex,
        onClose: async ({ indexName: resultIndexName, indexCreatedDuringFlyout }) => {
          await onFlyoutClose(indexName, resultIndexName, indexCreatedDuringFlyout);
        },
      } as EditLookupIndexContentContext);
    },
    [onFlyoutClose, uiActions]
  );

  return {
    addLookupIndicesDecorator,
    lookupIndexBadgeStyle,
  };
};
