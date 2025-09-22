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
import { firstValueFrom, of } from 'rxjs';
import type { ApplicationStart } from '@kbn/core/public';
import type { ESQLEditorDeps } from '../types';
import {
  appendIndexToJoinCommandByName,
  appendIndexToJoinCommandByPosition,
} from './append_index_to_join_command';
import { useLookupIndexPrivileges } from './use_lookup_index_privileges';

/**
 * monaco editor command ID for opening the lookup index flyout.
 */
export const COMMAND_ID = 'esql.lookup_index.create';

async function isCurrentAppSupported(
  currentAppId$: ApplicationStart['currentAppId$'] | undefined
): Promise<boolean> {
  const currentApp = await firstValueFrom(currentAppId$ ?? of(undefined));
  return currentApp === 'discover';
}

/**
 * Creates a command string for the lookup index badge in the ESQL editor.
 */
export function getMonacoCommandString(
  indexName: string,
  isExistingIndex: boolean,
  indexPrivileges: any
): string | undefined {
  const { canEditIndex, canReadIndex, canCreateIndex } = indexPrivileges;

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

  if (!actionLabel) {
    return;
  }

  return `[${actionLabel}](command:${COMMAND_ID}?${encodeURIComponent(
    JSON.stringify({
      indexName,
      doesIndexExist: isExistingIndex,
      canEditIndex,
      triggerSource: 'esql_hover',
    })
  )})`;
}

const DEBOUNCE_OPTIONS_PRIVILEGE_CHECK = { wait: 300, leading: true, trailing: false };

/**
 * Hook to determine if the current user has the necessary privileges to create a lookup index.
 */
export const useCanCreateLookupIndex = () => {
  const {
    services: { application },
  } = useKibana<ESQLEditorDeps>();
  const { getPermissions } = useLookupIndexPrivileges();

  const { run } = useDebounceFn(async (indexName?: string) => {
    if ((await isCurrentAppSupported(application?.currentAppId$)) === false) {
      return false;
    }

    try {
      const resultIndexName = indexName || '*';
      const permissions = await getPermissions([resultIndexName]);
      return permissions[resultIndexName]?.canCreateIndex ?? false;
    } catch (e) {
      return false;
    }
  }, DEBOUNCE_OPTIONS_PRIVILEGE_CHECK);

  return run as (indexName: string) => Promise<boolean>;
};

const DEBOUNCE_OPTIONS_FOR_DECORATOR = { wait: 500 };

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
    services: { uiActions, application },
  } = useKibana<ESQLEditorDeps>();
  const { getPermissions } = useLookupIndexPrivileges();

  const inQueryLookupIndices = useRef<string[]>([]);
  const decorationIdsRef = useRef<string[]>([]);

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

  const { run: addLookupIndicesDecorator } = useDebounceFn(async () => {
    if ((await isCurrentAppSupported(application?.currentAppId$)) === false) {
      return false;
    }

    const existingIndices = getLookupIndices ? await getLookupIndices() : { indices: [] };
    const lookupIndices: string[] = inQueryLookupIndices.current;
    const permissions = await getPermissions(lookupIndices);
    const newDecorations: monaco.editor.IModelDeltaDecoration[] = [];

    for (let i = 0; i < lookupIndices.length; i++) {
      const lookupIndex = lookupIndices[i];

      const isExistingIndex = existingIndices.indices.some((index) => index.name === lookupIndex);
      const matches =
        editorModel.current?.findMatches(lookupIndex, true, false, true, ' ', true) || [];

      const commandString = getMonacoCommandString(
        lookupIndex,
        isExistingIndex,
        permissions[lookupIndex]
      );

      if (!commandString) continue;

      matches.forEach((match) => {
        newDecorations.push({
          range: match.range,
          options: {
            isWholeLine: false,
            stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
            hoverMessage: {
              value: commandString,
              isTrusted: true,
            },

            inlineClassName:
              lookupIndexBaseBadgeClassName +
              ' ' +
              (isExistingIndex ? lookupIndexEditBadgeClassName : lookupIndexAddBadgeClassName),
          },
        });
      });
    }
    if (editorModel.current) {
      decorationIdsRef.current = editorModel.current.deltaDecorations(
        decorationIdsRef.current,
        newDecorations
      );
    }
  }, DEBOUNCE_OPTIONS_FOR_DECORATOR);

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
    async (
      indexName: string,
      doesIndexExist?: boolean,
      canEditIndex = true,
      triggerSource = 'esql_autocomplete'
    ) => {
      await uiActions.getTrigger('EDIT_LOOKUP_INDEX_CONTENT_TRIGGER_ID').exec({
        indexName,
        doesIndexExist,
        canEditIndex,
        triggerSource,
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
      COMMAND_ID,
      async (
        _,
        args: {
          indexName: string;
          doesIndexExist?: boolean;
          canEditIndex?: boolean;
          triggerSource?: string;
        }
      ) => {
        const { indexName, doesIndexExist, canEditIndex, triggerSource } = args;
        await openFlyoutRef.current(indexName, doesIndexExist, canEditIndex, triggerSource);
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
