/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useEffect, useRef, useState, type MutableRefObject } from 'react';
import type { HttpStart } from '@kbn/core/public';
import type { ESQLFieldWithMetadata, RecommendedField } from '@kbn/esql-types';
import type { TimeRange } from '@kbn/es-query';
import type { KibanaProject as SolutionId } from '@kbn/projects-solutions-groups';
import type { ISearchGeneric } from '@kbn/search-types';
import type { monaco } from '@kbn/monaco';
import { BROWSER_POPOVER_WIDTH, DataSourceSelectionChange } from '@kbn/esql-resource-browser';
import { getEditorExtensions, getEsqlColumns } from '@kbn/esql-utils';
import {
  getLocatedSourceItemsFromQuery,
  getQueryWithoutLastPipe,
  getRangeFromOffsets,
} from './utils';
import { BROWSER_POPOVER_VERTICAL_OFFSET, DEFAULT_FIELDS_BROWSER_INDEX } from './constants';
import type { BrowserPopoverPosition } from './types';

interface UseFieldsBrowserParams {
  editorRef: MutableRefObject<monaco.editor.IStandaloneCodeEditor | undefined>;
  editorModel: MutableRefObject<monaco.editor.ITextModel | undefined>;
  http: HttpStart;
  search: ISearchGeneric;
  getTimeRange: () => TimeRange;
  signal?: AbortSignal;
  activeSolutionId?: SolutionId;
}

export function useFieldsBrowser({
  editorRef,
  editorModel,
  http,
  search,
  getTimeRange,
  signal,
  activeSolutionId,
}: UseFieldsBrowserParams) {
  const [isFieldsBrowserOpen, setIsFieldsBrowserOpen] = useState(false);
  const [browserPopoverPosition, setBrowserPopoverPosition] = useState<BrowserPopoverPosition>({});

  const [allFields, setAllFields] = useState<ESQLFieldWithMetadata[]>([]);
  const [recommendedFields, setRecommendedFields] = useState<RecommendedField[]>([]);
  const [isLoadingFields, setIsLoadingFields] = useState(false);

  // Avoid React state updates after unmount (async fetches resolve later).
  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Offset where we start inserting the selected field.
  // We keep this stable for the lifetime of an open popover session.
  const insertAnchorOffsetRef = useRef<number | undefined>(undefined);
  // Length of the currently inserted text at the anchor. Used so we can replace our own inserted
  // segment when selection changes without scanning/re-parsing the query.
  const insertedTextLengthRef = useRef(0);
  // Field names suggested by autocomplete (passed via command args). When present, we use them to
  // filter the browser list to the contextually relevant fields.
  const suggestedFieldNamesRef = useRef<Set<string> | undefined>(undefined);

  const updatePopoverPosition = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;

    const cursorPosition = editor.getPosition();
    if (!cursorPosition) return;

    const editorCoords = editor.getDomNode()?.getBoundingClientRect();
    const editorPosition = editor.getScrolledVisiblePosition(cursorPosition);
    if (!editorCoords || !editorPosition) return;

    const absoluteTop =
      editorCoords.top + (editorPosition.top ?? 0) + BROWSER_POPOVER_VERTICAL_OFFSET;
    let absoluteLeft = editorCoords.left + (editorPosition.left ?? 0);

    if (absoluteLeft > editorCoords.width) {
      absoluteLeft = absoluteLeft - BROWSER_POPOVER_WIDTH;
    }

    setBrowserPopoverPosition({ top: absoluteTop, left: absoluteLeft });
  }, [editorRef]);

  const fetchFields = useCallback(
    async (queryText: string) => {
      // Run the query without the last pipe so trailing incomplete commands (e.g. "| KEEP")
      // are dropped and we get columns for the context the user is editing.
      const queryToRun = getQueryWithoutLastPipe(queryText);
      const mainSources = getLocatedSourceItemsFromQuery(queryToRun)
        .map((s) => s.name)
        .filter((name): name is string => Boolean(name));
      const indexPattern = mainSources.length
        ? mainSources.join(',')
        : DEFAULT_FIELDS_BROWSER_INDEX;
      // When the trimmed query has no source command (e.g. only "| STATS ..."), fall back
      // to a minimal FROM so the browser can still retrieve fields.
      const esqlQuery = queryToRun && mainSources.length ? queryToRun : `FROM ${indexPattern}`;

      return await getEsqlColumns({
        esqlQuery,
        search,
        timeRange: getTimeRange(),
        signal,
      });
    },
    [getTimeRange, search, signal]
  );

  const fetchRecommendedFields = useCallback(
    async (queryText: string) => {
      if (!activeSolutionId) return [];
      if (queryText.trim() === '') return [];

      try {
        const extensions = await getEditorExtensions(http, queryText, activeSolutionId);
        return extensions?.recommendedFields ?? [];
      } catch {
        return [];
      }
    },
    [activeSolutionId, http]
  );

  const openFieldsBrowser = useCallback(
    async (options?: { preloadedFields?: Array<{ name: string; type?: string }> }) => {
      const model = editorModel.current;
      const editor = editorRef.current;
      if (!model || !editor) return;

      // Reset per-open-session state.
      insertedTextLengthRef.current = 0;
      const preloadedFields = options?.preloadedFields;
      suggestedFieldNamesRef.current = preloadedFields?.length
        ? new Set(preloadedFields.map((f) => f.name))
        : undefined;

      const fullText = model.getValue() || '';
      const cursorPosition = editor.getPosition();
      if (!cursorPosition) return;

      const cursorOffset = model.getOffsetAt(cursorPosition);
      insertAnchorOffsetRef.current = cursorOffset;

      // If callers already have fields (e.g. from autocomplete context) we reuse them to avoid
      // an extra async fetch, improving responsiveness.
      const shouldUsePreloaded = Boolean(preloadedFields?.length);

      if (shouldUsePreloaded && preloadedFields) {
        const fieldsFromNames: ESQLFieldWithMetadata[] = preloadedFields.map((f) => ({
          name: f.name,
          type: (f.type as ESQLFieldWithMetadata['type']) ?? 'keyword',
          userDefined: false,
        }));
        setAllFields(fieldsFromNames);
        setIsLoadingFields(false);
        // Recommended fields are always fetched (even when using preloaded fields).
        fetchRecommendedFields(fullText).then((fetchedRecommended) => {
          if (isMountedRef.current) {
            setRecommendedFields(fetchedRecommended);
          }
        });
      } else {
        setIsLoadingFields(true);
        try {
          const [fetchedFields, fetchedRecommended] = await Promise.all([
            fetchFields(fullText),
            fetchRecommendedFields(fullText),
          ]);

          const suggested = suggestedFieldNamesRef.current;
          const filteredFields =
            suggested && suggested.size
              ? fetchedFields.filter((f) => suggested.has(f.name))
              : fetchedFields;

          if (isMountedRef.current) {
            setAllFields(filteredFields);
            setRecommendedFields(fetchedRecommended);
          }
        } catch {
          if (isMountedRef.current) {
            setAllFields([]);
            setRecommendedFields([]);
          }
        } finally {
          if (isMountedRef.current) {
            setIsLoadingFields(false);
          }
        }
      }

      updatePopoverPosition();
      setIsFieldsBrowserOpen(true);
    },
    [editorModel, editorRef, fetchFields, fetchRecommendedFields, updatePopoverPosition]
  );

  const handleFieldsBrowserSelect = useCallback(
    (fieldName: string, change: DataSourceSelectionChange) => {
      const editor = editorRef.current;
      const model = editorModel.current;
      const insertAtOffset = insertAnchorOffsetRef.current;
      if (!editor || !model || insertAtOffset == null) {
        return;
      }

      const textToInsert = change === DataSourceSelectionChange.Add ? fieldName : '';

      const start = insertAtOffset;
      const end = insertAtOffset + insertedTextLengthRef.current;

      editor.executeEdits('fieldsBrowser', [
        {
          range: getRangeFromOffsets(model, start, end),
          text: textToInsert,
        },
      ]);

      insertedTextLengthRef.current = textToInsert.length;
    },
    [editorRef, editorModel]
  );

  return {
    isFieldsBrowserOpen,
    setIsFieldsBrowserOpen,
    browserPopoverPosition,
    allFields,
    recommendedFields,
    isLoadingFields,
    openFieldsBrowser,
    handleFieldsBrowserSelect,
  };
}
