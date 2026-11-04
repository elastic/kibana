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
import { PROJECT_ROUTING } from '@kbn/cps-common';
import type { AggregateQuery } from '@kbn/es-query';
import type { ESQLSourceResult } from '@kbn/esql-types';
import { SOURCES_TYPES } from '@kbn/esql-types';
import { getIndexPatternFromESQLQuery, getSourceCommandFromESQLQuery } from '@kbn/esql-utils';
import { i18n } from '@kbn/i18n';
import type { EditIndexContentContext } from '@kbn/index-editor';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { monaco } from '@kbn/code-editor';
import { useDebounceFn } from '@kbn/react-hooks';
import { isEqual } from 'lodash';
import type React from 'react';
import { useCallback, useEffect, useRef } from 'react';
import type { ESQLEditorDeps } from '../types';
import type { IndexPrivileges } from './use_index_privileges';
import { useIndexPrivileges } from './use_index_privileges';
import {
  getHighestPrivilegeLevel,
  isCurrentAppSupported,
  type IndexEditorCommandArgs,
} from './use_lookup_index_editor';

/**
 * monaco editor command ID for opening the index editor flyout from a FROM source.
 */
export const FROM_INDEX_COMMAND_ID = 'esql.from_index.edit';

/**
 * Extracts the concrete, local index names referenced by a FROM command. Wildcards,
 * remote-cluster references, and non-FROM source commands (e.g. TS) are excluded, since
 * those cannot be mapped to a single editable index.
 */
export function getConcreteLocalFromIndices(esql: string): string[] {
  if (getSourceCommandFromESQLQuery(esql) !== 'FROM') {
    return [];
  }

  return getIndexPatternFromESQLQuery(esql)
    .split(',')
    .map((name) => name.trim())
    .filter((name) => name !== '' && !name.includes('*') && !name.includes(':'));
}

/**
 * Elasticsearch reserves index names that begin with a dot for hidden/system indices
 * (e.g. `.internal.alerts-*`, `.ds-*` backing indices). New indices with such names cannot be
 * created, and these indices are omitted from the ESQL sources list, so a plain existence check
 * would misreport them as missing. They should not be created or edited from the FROM badge.
 */
export function isReservedIndexName(indexName: string): boolean {
  return indexName
    .trim()
    .replace(/^["'`]+/, '')
    .startsWith('.');
}

/**
 * Creates a command string for the FROM index badge in the ESQL editor. Supports creating a
 * missing index and editing an existing one; read-only access and reserved (dot-prefixed)
 * names show no badge.
 */
export function getFromIndexCommandString(
  indexName: string,
  isExistingIndex: boolean,
  indexPrivileges: IndexPrivileges
): string | undefined {
  if (isReservedIndexName(indexName)) {
    return;
  }

  const { canEditIndex, canCreateIndex } = indexPrivileges;

  let actionLabel = '';
  if (isExistingIndex) {
    if (canEditIndex) {
      actionLabel = i18n.translate('esqlEditor.fromIndex.edit', {
        defaultMessage: 'Edit index',
      });
    }
  } else if (canCreateIndex) {
    actionLabel = i18n.translate('esqlEditor.fromIndex.create', {
      defaultMessage: 'Create index',
    });
  }

  if (!actionLabel) {
    return;
  }

  const highestPrivilege = getHighestPrivilegeLevel(indexPrivileges);

  return `[${actionLabel}](command:${FROM_INDEX_COMMAND_ID}?${encodeURIComponent(
    JSON.stringify({
      indexName,
      doesIndexExist: isExistingIndex,
      canEditIndex,
      triggerSource: 'esql_hover',
      highestPrivilege,
    })
  )})`;
}

const DEBOUNCE_OPTIONS_FOR_DECORATOR = { wait: 500 };

/**
 * Word separators passed to Monaco's `findMatches` when highlighting FROM source indices. Index
 * names cannot contain whitespace, commas, or quotes, so treating all of them as word boundaries
 * ensures every name in a multi-index `FROM a, b` is matched as its own token. Monaco's default of
 * only spaces merges `a,` into a single word and skips every name that is followed by a comma.
 */
const INDEX_NAME_WORD_SEPARATORS = [' ', '\t', '\n', '\r', ',', '"', "'", '`'].join('');

/**
 * The index editor always operates on the origin project, while a FROM query can be fanned out
 * across linked projects via Cross-Project Search (CPS). Editing is only safe when the query is
 * scoped to the origin, so the badge is offered only for origin-only routing: unset routing (no
 * CPS) and the explicit origin expression. `_alias:*` (all projects) and any named routing
 * expression may resolve to a different project's index and are treated as not editable here.
 */
export function isOriginOnlyProjectRouting(projectRouting: string | undefined): boolean {
  return projectRouting === undefined || projectRouting === PROJECT_ROUTING.ORIGIN;
}

/**
 * Hook to register a custom command and decorations for FROM source indices in the ESQL editor,
 * letting users create a missing index or edit an existing one directly from the query.
 */
export const useFromIndexCommand = (
  editorRef: React.MutableRefObject<monaco.editor.IStandaloneCodeEditor | undefined>,
  editorModel: React.MutableRefObject<monaco.editor.ITextModel | undefined>,
  getSources: (() => ESQLSourceResult[] | Promise<ESQLSourceResult[]>) | undefined,
  query: AggregateQuery,
  onIndexCreated: (resultQuery: string) => Promise<void>,
  onNewFieldsAddedToIndex?: (indexName: string) => void,
  onOpenIndexInDiscover?: EditIndexContentContext['onOpenIndexInDiscover'],
  projectRouting?: string
) => {
  const { euiTheme } = useEuiTheme();
  const {
    services: { uiActions, application },
  } = useKibana<ESQLEditorDeps>();
  const { getPermissions } = useIndexPrivileges();

  const inQueryFromIndices = useRef<string[]>([]);
  const decorationIdsRef = useRef<string[]>([]);
  // Read inside the debounced decorator so a project-picker change is always reflected without
  // recreating the callback; the effect below also refreshes the badges when routing changes.
  const projectRoutingRef = useRef(projectRouting);

  useEffect(
    function parseIndicesOnChange() {
      const updated = getConcreteLocalFromIndices(query.esql);
      if (!isEqual(updated, inQueryFromIndices.current)) {
        inQueryFromIndices.current = updated;
      }
    },
    [query.esql]
  );

  const fromIndexBaseBadgeClassName = 'fromIndexBadge';
  const fromIndexAddBadgeClassName = 'fromIndexAddBadge';
  const fromIndexEditBadgeClassName = 'fromIndexEditBadge';
  const fromIndexBadgeStyle = css`
    .${fromIndexBaseBadgeClassName} {
      white-space: nowrap;
      text-align: start;
      color: ${euiTheme.colors.textParagraph};
    }

    .${fromIndexAddBadgeClassName} {
    }

    .${fromIndexEditBadgeClassName} {
      border-bottom: ${euiTheme.border.width.thick} dotted ${euiTheme.colors.textParagraph};
    }
  `;

  const { run: addFromIndicesDecorator } = useDebounceFn(async () => {
    if ((await isCurrentAppSupported(application?.currentAppId$)) === false) {
      return false;
    }

    // Cross-Project Search sends the query to linked projects, but the editor only ever operates
    // on the origin project, so a badge could silently target the wrong index. Treat non-origin
    // routing as having no editable indices, which clears any existing badges below.
    const fromIndices = isOriginOnlyProjectRouting(projectRoutingRef.current)
      ? inQueryFromIndices.current
      : [];
    if (fromIndices.length === 0) {
      if (editorModel.current) {
        decorationIdsRef.current = editorModel.current.deltaDecorations(
          decorationIdsRef.current,
          []
        );
      }
      return;
    }

    const sources = getSources ? await getSources() : [];
    const sourceByName = new Map(sources.map((source) => [source.name, source]));
    const permissions = await getPermissions(fromIndices);
    const newDecorations: monaco.editor.IModelDeltaDecoration[] = [];

    for (const indexName of fromIndices) {
      const existingSource = sourceByName.get(indexName);

      // Only single concrete indices are editable; skip aliases, data streams, etc.
      if (existingSource && existingSource.type !== SOURCES_TYPES.INDEX) {
        continue;
      }

      const isExistingIndex = Boolean(existingSource);
      const commandString = getFromIndexCommandString(
        indexName,
        isExistingIndex,
        permissions[indexName]
      );

      if (!commandString) continue;

      const badgeClassName = isExistingIndex
        ? fromIndexEditBadgeClassName
        : fromIndexAddBadgeClassName;
      const matches =
        editorModel.current?.findMatches(
          indexName,
          true,
          false,
          true,
          INDEX_NAME_WORD_SEPARATORS,
          true
        ) || [];

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
            inlineClassName: fromIndexBaseBadgeClassName + ' ' + badgeClassName,
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

  useEffect(
    function refreshBadgesOnProjectRoutingChange() {
      projectRoutingRef.current = projectRouting;
      addFromIndicesDecorator();
    },
    [projectRouting, addFromIndicesDecorator]
  );

  const onFlyoutClose = useCallback(
    async (resultIndexName: string | null, indexCreated: boolean, indexHasNewFields: boolean) => {
      if (indexHasNewFields && resultIndexName) {
        onNewFieldsAddedToIndex?.(resultIndexName);
      }

      // The FROM source already references the index by name, so there is nothing to rewrite in
      // the query. We force a re-validation (the query may now resolve) and refresh the badges so
      // a newly created index flips from "Create" to "Edit".
      if (indexCreated && resultIndexName !== null) {
        await onIndexCreated(query.esql);
      }

      await addFromIndicesDecorator();
    },
    [addFromIndicesDecorator, onIndexCreated, onNewFieldsAddedToIndex, query.esql]
  );

  const openFlyout = useCallback(
    async (
      indexName: string,
      doesIndexExist?: boolean,
      canEditIndex = true,
      triggerSource = 'esql_autocomplete'
    ) => {
      await uiActions.executeTriggerActions('EDIT_INDEX_CONTENT_TRIGGER_ID', {
        indexName,
        doesIndexExist,
        canEditIndex,
        indexMode: 'standard',
        triggerSource,
        onClose: async ({
          indexName: resultIndexName,
          indexCreatedDuringFlyout,
          indexHasNewFields,
        }) => {
          await onFlyoutClose(resultIndexName, indexCreatedDuringFlyout, indexHasNewFields);
        },
        onOpenIndexInDiscover,
      } as EditIndexContentContext);
    },
    [onFlyoutClose, onOpenIndexInDiscover, uiActions]
  );

  const openFlyoutRef = useRef(openFlyout);
  useEffect(() => {
    openFlyoutRef.current = openFlyout;
  }, [openFlyout]);

  useEffect(function registerCommandOnMount() {
    const disposable = monaco.editor.registerCommand(
      FROM_INDEX_COMMAND_ID,
      async (_, args: IndexEditorCommandArgs) => {
        const { indexName, doesIndexExist, canEditIndex, triggerSource } = args;
        await openFlyoutRef.current(indexName, doesIndexExist, canEditIndex, triggerSource);
      }
    );
    return () => {
      disposable.dispose();
    };
  }, []);

  return {
    addFromIndicesDecorator,
    fromIndexBadgeStyle,
  };
};
