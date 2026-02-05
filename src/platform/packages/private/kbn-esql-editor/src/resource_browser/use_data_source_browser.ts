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
  const [selectedSources, setSelectedSources] = useState<string[]>([]);

  const sourcesRangeRef = useRef<monaco.IRange | undefined>(undefined);
  const isTSCommandRef = useRef(false);

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

    console.log('absoluteTop', absoluteTop);
    console.log('absoluteLeft', absoluteLeft);

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

  const openIndicesBrowser = useCallback(async () => {
    const model = editorModel.current;
    const editor = editorRef.current;
    if (!model || !editor) return;

    const fullText = model.getValue() || '';
    const indexPattern = getIndexPatternFromESQLQuery(fullText);
    const currentSelectedSources = indexPattern ? indexPattern.split(',').filter(Boolean) : [];
    setSelectedSources(currentSelectedSources);

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
      } else {
        const cursorPosition = editor.getPosition();
        if (cursorPosition) {
          const offset = model.getOffsetAt(cursorPosition);
          sourcesRangeRef.current = getRangeFromOffsets(model, offset, offset);
        }
      }
    } catch {
      // If parsing fails, fall back to inserting at the current cursor position.
      const cursorPosition = editor.getPosition();
      if (cursorPosition) {
        const offset = model.getOffsetAt(cursorPosition);
        sourcesRangeRef.current = getRangeFromOffsets(model, offset, offset);
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
    (newSelectedSources: string[]) => {
      // TODO: This logic needs to be updated
      // Currently, we replace the whole range of sources with the new selected sources
      // We should instead insert the new selected sources at the cursor position when the browser is open from autocomplete suggestion
      // When the browser is open from the badge, we should append the new selected sources to the existing sources
      const editor = editorRef.current;
      const model = editorModel.current;
      const range = sourcesRangeRef.current;

      if (!editor || !model || !range) {
        setSelectedSources(newSelectedSources);
        return;
      }

      const newText = newSelectedSources.join(', ');

      editor.executeEdits('dataSourceBrowser', [
        {
          range,
          text: newText,
        },
      ]);

      // Update range end column after replacement so subsequent changes keep targeting the same region.
      const startOffset = model.getOffsetAt({
        lineNumber: range.startLineNumber,
        column: range.startColumn,
      });
      const updatedRange = getRangeFromOffsets(model, startOffset, startOffset + newText.length);
      sourcesRangeRef.current = updatedRange;

      setSelectedSources(newSelectedSources);
    },
    [editorRef, editorModel]
  );

  return {
    isDataSourceBrowserOpen,
    setIsDataSourceBrowserOpen,
    browserPopoverPosition,
    allSources,
    isLoadingSources,
    selectedSources,
    openIndicesBrowser,
    handleDataSourceBrowserSelect,
  };
}

