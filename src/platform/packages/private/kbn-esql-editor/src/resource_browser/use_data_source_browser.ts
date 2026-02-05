/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useRef, useState, type MutableRefObject } from 'react';
import type { ESQLCallbacks, ESQLSourceResult, IndicesAutocompleteResult } from '@kbn/esql-types';
import type { monaco } from '@kbn/monaco';
import { Parser, type ESQLSource } from '@kbn/esql-language';
import { getIndexPatternFromESQLQuery } from '@kbn/esql-utils';
import { BROWSER_POPOVER_WIDTH } from '@kbn/esql-resource-browser';
import {
  computeInsertionText,
  computeRemovalRange,
  getLocatedSourceItemsFromQuery,
} from './utils';

interface UseDataSourceBrowserParams {
  editorRef: MutableRefObject<monaco.editor.IStandaloneCodeEditor | undefined>;
  editorModel: MutableRefObject<monaco.editor.ITextModel | undefined>;
  esqlCallbacks: ESQLCallbacks;
}

interface BrowserPopoverPosition {
  top?: number;
  left?: number;
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

export function useDataSourceBrowser({ editorRef, editorModel, esqlCallbacks }: UseDataSourceBrowserParams) {
  const [isDataSourceBrowserOpen, setIsDataSourceBrowserOpen] = useState(false);
  const [browserPopoverPosition, setBrowserPopoverPosition] = useState<BrowserPopoverPosition>({});

  const [allSources, setAllSources] = useState<ESQLSourceResult[]>([]);
  const [isLoadingSources, setIsLoadingSources] = useState(false);

  const sourcesRangeRef = useRef<monaco.IRange | undefined>(undefined);
  const isTSCommandRef = useRef(false);
  const openModeRef = useRef<'badge' | 'autocomplete'>('autocomplete');
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

    const absoluteTop = editorCoords.top + (editorPosition.top ?? 0) + 20; // 20px to account for the line height
    let absoluteLeft = editorCoords.left + (editorPosition.left ?? 0);

    if (absoluteLeft > editorCoords.width) {
      absoluteLeft = absoluteLeft - BROWSER_POPOVER_WIDTH;
    }

    setBrowserPopoverPosition({ top: absoluteTop, left: absoluteLeft });
  }, [editorRef]);

  const fetchSources = useCallback(async () => {
    const { getSources, getTimeseriesIndices } = esqlCallbacks;
    if (isTSCommandRef.current) {
      const result = await getTimeseriesIndices?.();
      if (!result || typeof result !== 'object' || !('indices' in result)) {
        return [];
      }
      return normalizeTimeseriesIndices(result as IndicesAutocompleteResult);
    }

    return (await getSources?.()) ?? [];
  }, [esqlCallbacks]);

  const openIndicesBrowser = useCallback(async (options?: { openedFrom?: 'badge' | 'autocomplete' }) => {
    const model = editorModel.current;
    const editor = editorRef.current;
    if (!model || !editor) return;

    openModeRef.current = options?.openedFrom ?? 'autocomplete';

    const fullText = model.getValue() || '';
    const indexPattern = getIndexPatternFromESQLQuery(fullText);
    const currentSelectedSources = indexPattern ? indexPattern.split(',').filter(Boolean) : [];
    selectedSourcesRef.current = currentSelectedSources;

    const cursorPosition = editor.getPosition();
    openCursorOffsetRef.current = cursorPosition ? model.getOffsetAt(cursorPosition) : undefined;
    insertionOffsetRef.current = openCursorOffsetRef.current;

    // Get the range of the sources
    try {
      const { root } = Parser.parse(fullText, { withFormatting: true });
      const sourceCommand = root.commands.find(({ name }) => name === 'from' || name === 'ts');
      isTSCommandRef.current = sourceCommand?.name === 'ts';

      const sources = (sourceCommand?.args ?? []).filter(
        (arg): arg is ESQLSource => Boolean(arg && typeof arg === 'object' && (arg as ESQLSource).type === 'source')
      );

      if (sources.length > 0) {
        const startOffset = Math.min(...sources.map((s) => s.location.min));
        const endOffset = Math.max(...sources.map((s) => s.location.max)) + 1;
        sourcesRangeRef.current = getRangeFromOffsets(model, startOffset, endOffset);
        // If opened from the badge, we always insert at the beginning of the sources list.
        if (openModeRef.current === 'badge') {
          insertionOffsetRef.current = startOffset;
        }
      } else {
        const offset = openCursorOffsetRef.current;
        if (offset) {
          sourcesRangeRef.current = getRangeFromOffsets(model, offset, offset);
          insertionOffsetRef.current = offset;
        }
      }
    } catch {
      // If parsing fails, fall back to inserting at the current cursor position.
      const offset = openCursorOffsetRef.current;
      if (typeof offset === 'number') {
        sourcesRangeRef.current = getRangeFromOffsets(model, offset, offset);
        insertionOffsetRef.current = offset;
      }
      isTSCommandRef.current = false;
    }

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

    // Update the popover position
    updatePopoverPosition();

    setIsDataSourceBrowserOpen(true);
  }, [editorModel, editorRef, updatePopoverPosition, fetchSources]);

  const handleDataSourceBrowserSelect = useCallback(
    (sourceName: string, change: 'add' | 'remove') => {
      const editor = editorRef.current;
      const model = editorModel.current;
      const insertAtOffset = insertionOffsetRef.current;

      const previous = selectedSourcesRef.current;
      const newSelectedSources =
        change === 'add'
          ? previous.includes(sourceName)
            ? previous
            : [...previous, sourceName]
          : previous.filter((s) => s !== sourceName);

      // Keep selection state in sync with the browser UI even if we can't edit the query.
      selectedSourcesRef.current = newSelectedSources;

      if (!editor || !model || typeof insertAtOffset !== 'number') {
        return;
      }

      const applyDelete = (start: number, end: number) => {
        editor.executeEdits('dataSourceBrowser', [
          {
            range: getRangeFromOffsets(model, start, end),
            text: '',
          },
        ]);

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

        if (openModeRef.current === 'autocomplete') {
          insertionOffsetRef.current = at + text.length;
        }
      };

      if (change === 'remove') {
        const currentText = model.getValue() || '';
        const currentItems = getLocatedSourceItemsFromQuery(currentText);
        const range = computeRemovalRange(currentText, currentItems, sourceName);
        if (!range) return;
        applyDelete(range.start, range.end);
        return;
      } else {
        const currentText = model.getValue() || '';
        const at = insertionOffsetRef.current ?? insertAtOffset;
        const currentItems = getLocatedSourceItemsFromQuery(currentText).map(({ min, max }) => ({ min, max }));
        const { at: insertAt, text } = computeInsertionText({
          query: currentText,
          items: currentItems,
          at: openModeRef.current === 'badge' ? openCursorOffsetRef.current ?? at : at,
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

