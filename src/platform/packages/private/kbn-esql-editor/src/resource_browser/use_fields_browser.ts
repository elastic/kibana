/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useRef, useState, type MutableRefObject } from 'react';
import type { ESQLCallbacks, ESQLFieldWithMetadata, RecommendedField } from '@kbn/esql-types';
import type { monaco } from '@kbn/monaco';
import { BROWSER_POPOVER_WIDTH, DataSourceSelectionChange } from '@kbn/esql-resource-browser';
import { getLocatedSourceItemsFromQuery } from './utils';
import { BROWSER_POPOVER_VERTICAL_OFFSET } from './const';

interface UseFieldsBrowserParams {
  editorRef: MutableRefObject<monaco.editor.IStandaloneCodeEditor | undefined>;
  editorModel: MutableRefObject<monaco.editor.ITextModel | undefined>;
  esqlCallbacks: ESQLCallbacks;
}

interface BrowserPopoverPosition {
  top?: number;
  left?: number;
}

const DEFAULT_FIELDS_BROWSER_INDEX = '.kibana';

const getRangeFromOffsets = (
  model: monaco.editor.ITextModel,
  startOffset: number,
  endOffset: number
): monaco.IRange => {
  const start = model.getPositionAt(startOffset);
  const end = model.getPositionAt(endOffset);
  return {
    startLineNumber: start.lineNumber,
    startColumn: start.column,
    endLineNumber: end.lineNumber,
    endColumn: end.column,
  };
};

export function useFieldsBrowser({
  editorRef,
  editorModel,
  esqlCallbacks,
}: UseFieldsBrowserParams) {
  const [isFieldsBrowserOpen, setIsFieldsBrowserOpen] = useState(false);
  const [browserPopoverPosition, setBrowserPopoverPosition] = useState<BrowserPopoverPosition>({});

  const [allFields, setAllFields] = useState<ESQLFieldWithMetadata[]>([]);
  const [recommendedFields, setRecommendedFields] = useState<RecommendedField[]>([]);
  const [isLoadingFields, setIsLoadingFields] = useState(false);

  // Offset where we start inserting the comma-separated list of selected fields.
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
      const { getColumnsFor } = esqlCallbacks;
      if (!getColumnsFor) return [];

      // We only need a source command to retrieve fields. When the current query doesn't have
      // any sources yet, fall back to a stable Kibana index so the browser can still function.
      const mainSources = getLocatedSourceItemsFromQuery(queryText)
        .map((s) => s.name)
        .filter((name): name is string => Boolean(name));
      const indexPattern = mainSources.length ? mainSources.join(',') : DEFAULT_FIELDS_BROWSER_INDEX;
      const minimalQuery = `FROM ${indexPattern} | LIMIT 0`;

      return (await getColumnsFor({ query: minimalQuery })) ?? [];
    },
    [esqlCallbacks]
  );

  const fetchRecommendedFields = useCallback(
    async (queryText: string) => {
      const extensions = await esqlCallbacks.getEditorExtensions?.(queryText);
      return extensions?.recommendedFields ?? [];
    },
    [esqlCallbacks]
  );

  const openFieldsBrowser = useCallback(
    async (options?: { preloadedFields?: string[] }) => {
      const model = editorModel.current;
      const editor = editorRef.current;
      if (!model || !editor) return;

      // Reset per-open-session state.
      insertedTextLengthRef.current = 0;
      suggestedFieldNamesRef.current =
        options?.preloadedFields?.length ? new Set(options.preloadedFields) : undefined;

      const fullText = model.getValue() || '';
      const cursorPosition = editor.getPosition();
      if (!cursorPosition) return;

    const cursorOffset = model.getOffsetAt(cursorPosition);
    insertAnchorOffsetRef.current = cursorOffset;
    insertedTextLengthRef.current = 0;

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

        setAllFields(filteredFields);
        setRecommendedFields(fetchedRecommended);
      } catch {
        setAllFields([]);
        setRecommendedFields([]);
      } finally {
        setIsLoadingFields(false);
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
      if (!editor || !model || typeof insertAtOffset !== 'number') {
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