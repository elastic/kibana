/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import type { AggregateQuery } from '@kbn/es-query';
import type { IndexAutocompleteItem } from '@kbn/esql-types';
import { getLookupIndicesFromQuery } from '@kbn/esql-utils';
import { i18n } from '@kbn/i18n';
import type { EditLookupIndexContentContext } from '@kbn/index-editor';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { monaco } from '@kbn/monaco';
import { useDebounceFn } from '@kbn/react-hooks';
import { isEqual } from 'lodash';
import type React from 'react';
import { useCallback, useEffect, useRef } from 'react';
import type { ESQLEditorDeps } from '../types';
import {
  appendIndexToJoinCommandByName,
  appendIndexToJoinCommandByPosition,
} from './append_index_to_join_command';
import { useLookupIndexPrivileges } from './use_lookup_index_privileges';

/**
 * Hook to determine if the current user has the necessary privileges to create a lookup index.
 */
export const useCanCreateLookupIndex = () => {
  const { getPermissions } = useLookupIndexPrivileges();

  const { run } = useDebounceFn(
    async (indexName: string) => {
      if (!indexName) return false;
      try {
        const permissions = await getPermissions([indexName]);
        return permissions[indexName]?.canCreateIndex ?? false;
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
    services: { uiActions, docLinks },
  } = useKibana<ESQLEditorDeps>();
  const { getPermissions } = useLookupIndexPrivileges();

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

  // TODO: Replace with the actual lookup index docs URL once it's available
  // @ts-ignore
  const lookupIndexDocsUrl = docLinks?.links.apis.createIndex;

  const { run: addLookupIndicesDecorator } = useDebounceFn(
    async () => {
      const existingIndices = getLookupIndices ? await getLookupIndices() : { indices: [] };

      const lookupIndices: string[] = inQueryLookupIndices.current;
      const permissions = await getPermissions(lookupIndices);

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
        const { canCreateIndex, canReadIndex, canEditIndex } = permissions[lookupIndex];

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

      let resultQuery: string;
      if (initialIndexName) {
        resultQuery = appendIndexToJoinCommandByName(query.esql, initialIndexName, resultIndexName);
      } else {
        resultQuery = appendIndexToJoinCommandByPosition(
          query.esql,
          cursorPosition!,
          resultIndexName
        );
      }

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

  const openFlyoutRef = useRef(openFlyout);
  useEffect(() => {
    openFlyoutRef.current = openFlyout;
  }, [openFlyout]);

  useEffect(function registerCommandOnMount() {
    const disposable = monaco.editor.registerCommand(
      'esql.lookup_index.create',
      async (_, args: { indexName: string; doesIndexExist?: boolean; canEditIndex?: boolean }) => {
        const { indexName, doesIndexExist, canEditIndex } = args;
        await openFlyoutRef.current(indexName, doesIndexExist, canEditIndex);
      }
    );
    return () => {
      disposable.dispose();
    };
  }, []);

  return {
    addLookupIndicesDecorator,
    lookupIndexBadgeStyle,
  };
};
