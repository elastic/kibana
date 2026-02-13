/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useRef, useState, type MutableRefObject } from 'react';
import type {
  ESQLCallbacks,
  ESQLSourceResult,
  IndicesAutocompleteResult,
  IndexAutocompleteItem,
} from '@kbn/esql-types';
import type { monaco } from '@kbn/monaco';
import { BROWSER_POPOVER_WIDTH, DataSourceSelectionChange } from '@kbn/esql-resource-browser';
import {
  computeInsertionText,
  computeRemovalRange,
  getLocatedSourceItemsFromQuery,
  getSourceCommandContextFromQuery,
  getRangeFromOffsets,
} from './utils';
import type { BrowserPopoverPosition } from './types';
import { IndicesBrowserOpenMode } from './types';
import { BROWSER_POPOVER_VERTICAL_OFFSET } from './constants';

interface UseDataSourceBrowserParams {
  editorRef: MutableRefObject<monaco.editor.IStandaloneCodeEditor | undefined>;
  editorModel: MutableRefObject<monaco.editor.ITextModel | undefined>;
  esqlCallbacks: ESQLCallbacks;
}

const normalizeTimeseriesIndices = (result: IndicesAutocompleteResult): ESQLSourceResult[] => {
  return (
    result.indices?.map((index) => ({
      name: index.name,
      type: 'timeseries',
      title: index.name,
      hidden: false,
    })) ?? []
  );
};

export function useDataSourceBrowser({
  editorRef,
  editorModel,
  esqlCallbacks,
}: UseDataSourceBrowserParams) {
  const [isDataSourceBrowserOpen, setIsDataSourceBrowserOpen] = useState(false);
  const [browserPopoverPosition, setBrowserPopoverPosition] = useState<BrowserPopoverPosition>({});

  const [allSources, setAllSources] = useState<ESQLSourceResult[]>([]);
  const [isLoadingSources, setIsLoadingSources] = useState(false);

  const sourcesRangeRef = useRef<monaco.IRange | undefined>(undefined);
  const isTSCommandRef = useRef(false);
  const openModeRef = useRef<IndicesBrowserOpenMode>(IndicesBrowserOpenMode.Autocomplete);
  const openCursorOffsetRef = useRef<number | undefined>(undefined);
  const insertionOffsetRef = useRef<number | undefined>(undefined);
  const selectedSourcesRef = useRef<string[]>([]);

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

  const fetchSources = useCallback(async () => {
    const { getSources, getTimeseriesIndices } = esqlCallbacks;
    if (isTSCommandRef.current) {
      const result = (await getTimeseriesIndices?.()) ?? { indices: [] };
      return normalizeTimeseriesIndices(result);
    }

    return (await getSources?.()) ?? [];
  }, [esqlCallbacks]);

  const openIndicesBrowser = useCallback(
    async (options?: {
      openedFrom?: IndicesBrowserOpenMode;
      preloadedSources?: ESQLSourceResult[];
      preloadedTimeSeriesSources?: IndexAutocompleteItem[];
    }) => {
      const model = editorModel.current;
      const editor = editorRef.current;
      if (!model || !editor) return;

      // Remember where the browser was opened from. This affects insertion behavior:
      // - `Badge`: we always insert at the beginning of the sources list
      // - `Autocomplete`: we insert at (and then advance) the cursor position
      openModeRef.current = options?.openedFrom ?? IndicesBrowserOpenMode.Autocomplete;

      // Snapshot current selection state at open time.
      // The browser UI is driven by `selectedSourcesRef.current`.
      const fullText = model.getValue() || '';
      selectedSourcesRef.current = getLocatedSourceItemsFromQuery(fullText)
        .map((it) => it.name)
        .filter((name): name is string => Boolean(name));

      // Capture cursor offset at the moment we open the popover.
      // We keep it in a ref because the actual edits happen later (on selection changes).
      const cursorPosition = editor.getPosition();
      openCursorOffsetRef.current = cursorPosition ? model.getOffsetAt(cursorPosition) : undefined;

      // Compute the "main source command" context (FROM/TS, the existing sources range, and where
      // we'd like to insert a newly-selected source) from the query text.
      // This is extracted as a pure helper so it can be unit-tested independently of Monaco.
      const sourceCtx = getSourceCommandContextFromQuery({
        queryText: fullText,
        cursorOffset: openCursorOffsetRef.current,
        openedFrom: openModeRef.current,
      });
      isTSCommandRef.current = sourceCtx.command === 'ts';

      if (
        typeof sourceCtx.sourcesStartOffset === 'number' &&
        typeof sourceCtx.sourcesEndOffset === 'number'
      ) {
        // There are existing sources: store the sources range so insert/remove operations can
        // preserve user formatting by doing minimal edits inside that span.
        sourcesRangeRef.current = getRangeFromOffsets(
          model,
          sourceCtx.sourcesStartOffset,
          sourceCtx.sourcesEndOffset
        );
      } else if (typeof sourceCtx.insertionOffset === 'number') {
        // No sources yet (or parsing failed): fall back to using the cursor as the insertion point.
        sourcesRangeRef.current = getRangeFromOffsets(
          model,
          sourceCtx.insertionOffset,
          sourceCtx.insertionOffset
        );
      }

      // This is the "active" insertion anchor. For badge mode it stays at the beginning, while
      // in autocomplete mode we advance it after each insert so repeated inserts happen naturally
      // at the caret.
      insertionOffsetRef.current = sourceCtx.insertionOffset;

      // If callers already have sources (e.g. from autocomplete context) we can reuse them to avoid
      // an extra async fetch, improving responsiveness.
      const preloadedSources = options?.preloadedSources;
      const preloadedTimeSeriesSources = options?.preloadedTimeSeriesSources;
      const shouldUsePreloaded = Boolean(
        (isTSCommandRef.current && preloadedTimeSeriesSources?.length) ||
          (!isTSCommandRef.current && preloadedSources?.length)
      );

      if (shouldUsePreloaded) {
        const normalized =
          isTSCommandRef.current && preloadedTimeSeriesSources
            ? normalizeTimeseriesIndices({ indices: preloadedTimeSeriesSources })
            : preloadedSources ?? [];
        setAllSources(normalized);
        setIsLoadingSources(false);
      } else {
        // Fetch the sources
        setIsLoadingSources(true);
        try {
          const fetched = await fetchSources();
          setAllSources(fetched);
        } catch {
          setAllSources([]);
        } finally {
          setIsLoadingSources(false);
        }
      }

      // Position the popover near the cursor before opening it.
      updatePopoverPosition();

      setIsDataSourceBrowserOpen(true);
    },
    [editorModel, editorRef, updatePopoverPosition, fetchSources]
  );

  const handleDataSourceBrowserSelect = useCallback(
    (sourceName: string, change: DataSourceSelectionChange) => {
      const editor = editorRef.current;
      const model = editorModel.current;
      const insertAtOffset = insertionOffsetRef.current;

      if (!editor || !model || insertAtOffset == null) {
        return;
      }

      // The browser UI emits single-item changes (select/deselect). Reflect that in our local
      // selection ref first
      const previous = selectedSourcesRef.current;
      const newSelectedSources =
        change === DataSourceSelectionChange.Add
          ? previous.includes(sourceName)
            ? previous
            : [...previous, sourceName]
          : previous.filter((s) => s !== sourceName);

      // Keep selection state in sync with the browser UI even if we can't edit the query.
      selectedSourcesRef.current = newSelectedSources;

      // We use minimal edits (insert/delete exact spans) rather than rewriting the whole sources
      // list so we preserve user formatting, spacing, and any unknown sources.
      const applyDelete = (start: number, end: number) => {
        editor.executeEdits('dataSourceBrowser', [
          {
            range: getRangeFromOffsets(model, start, end),
            text: '',
          },
        ]);

        // Keep the insertion anchor stable after a deletion:
        // - if we deleted text before the anchor, shift it left
        // - if we deleted across the anchor, clamp it to the deletion start
        const deletionLength = end - start;
        if (insertionOffsetRef.current != null) {
          if (insertionOffsetRef.current > end) insertionOffsetRef.current -= deletionLength;
          else if (insertionOffsetRef.current > start) insertionOffsetRef.current = start;
        }
      };

      const applyInsert = (at: number, text: string) => {
        editor.executeEdits('dataSourceBrowser', [
          {
            range: getRangeFromOffsets(model, at, at),
            text,
          },
        ]);

        // In autocomplete mode we want the "next insertion" to happen after what we just inserted,
        // so repeated selections feel natural. In badge mode, we keep inserting at the beginning.
        if (openModeRef.current === IndicesBrowserOpenMode.Autocomplete) {
          insertionOffsetRef.current = at + text.length;
        }
      };

      if (change === DataSourceSelectionChange.Remove) {
        // Removal is location-aware: remove the target source token plus the adjacent comma
        // according to our "front vs middle/end" rules, while preserving surrounding whitespace.
        const currentText = model.getValue() || '';
        const currentItems = getLocatedSourceItemsFromQuery(currentText);
        const range = computeRemovalRange(currentText, currentItems, sourceName);
        if (!range) return;
        applyDelete(range.start, range.end);
      } else {
        // Insertion is also location-aware. For badge mode, we insert at the beginning of the
        // sources list; for autocomplete mode, we insert at the cursor and add leading/trailing
        // commas only when needed based on surrounding tokens.
        const currentText = model.getValue() || '';
        const at = insertionOffsetRef.current ?? insertAtOffset;
        const currentItems = getLocatedSourceItemsFromQuery(currentText).map(({ min, max }) => ({
          min,
          max,
        }));
        const { at: insertAt, text } = computeInsertionText({
          query: currentText,
          items: currentItems,
          at:
            openModeRef.current === IndicesBrowserOpenMode.Badge
              ? openCursorOffsetRef.current ?? at
              : at,
          sourceName,
          mode: openModeRef.current,
        });
        applyInsert(insertAt, text);
      }
    },
    [editorRef, editorModel]
  );

  return {
    isDataSourceBrowserOpen,
    setIsDataSourceBrowserOpen,
    browserPopoverPosition,
    allSources,
    isLoadingSources,
    selectedSources: selectedSourcesRef.current,
    openIndicesBrowser,
    handleDataSourceBrowserSelect,
  };
}
