/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useRef, useState } from 'react';
import type * as monaco from 'monaco-editor';
import type { ESQLCallbacks } from '@kbn/esql-types';
import { correctQuerySyntax } from '@kbn/esql-language/src/commands/definitions/utils/ast';
import { Parser } from '@kbn/esql-language';
import { getCursorContext } from '@kbn/esql-language/src/language/shared/get_cursor_context';
import { getQueryForFields } from '@kbn/esql-language/src/language/shared/get_query_for_fields';
import { getColumnsByTypeRetriever } from '@kbn/esql-language/src/language/shared/columns_retrieval_helpers';
import { BROWSER_POPOVER_WIDTH } from './browser_popover_wrapper';

interface UseResourceBrowserProps {
  editorRef: React.MutableRefObject<monaco.editor.IStandaloneCodeEditor | undefined>;
  editorModel: React.MutableRefObject<monaco.editor.ITextModel | undefined>;
  esqlCallbacks: ESQLCallbacks;
}

interface BrowserPopoverPosition {
  top?: number;
  left?: number;
}

export function useResourceBrowser({
  editorRef,
  editorModel,
  esqlCallbacks,
}: UseResourceBrowserProps) {
  const [isDataSourceBrowserOpen, setIsDataSourceBrowserOpen] = useState(false);
  const [isFieldsBrowserOpen, setIsFieldsBrowserOpen] = useState(false);
  const fieldsBrowserGetColumnMapRef = useRef<(() => Promise<Map<string, any>>) | undefined>(
    undefined
  );
  const [browserPopoverPosition, setBrowserPopoverPosition] = useState<BrowserPopoverPosition>({});
  const browserCursorPositionRef = useRef<monaco.Position | null>(null);
  const fieldsBrowserQueryStringRef = useRef<string>('');

  const handleResourceBrowserSelect = useCallback((newResourceNames: string, oldLength: number) => {
    if (editorRef.current && editorModel.current && browserCursorPositionRef.current) {
      const initialCursorPosition = browserCursorPositionRef.current;
      const textAfterInitialCursor = editorModel.current
        .getValue()
        .substring(initialCursorPosition.column);
      // Check if there is a resource after the initial cursor - match any whitespace or newline followed by a letter or dot
      const hasExistingResourceAfterInitialCursor =
        textAfterInitialCursor.match(/^[\s\n]*[a-zA-Z.].*/);

      const range = {
        startLineNumber: initialCursorPosition.lineNumber,
        startColumn: initialCursorPosition.column,
        endLineNumber: initialCursorPosition.lineNumber,
        endColumn:
          initialCursorPosition.column +
          oldLength +
          (oldLength > 0 && newResourceNames.length === 0 && hasExistingResourceAfterInitialCursor
            ? 1
            : 0), // Delete comma if all resources are deleted and there was some inserted resource before
      };
      editorRef.current.executeEdits('indicesBrowser', [
        {
          range,
          text:
            newResourceNames +
            (oldLength === 0 && newResourceNames.length > 0 && hasExistingResourceAfterInitialCursor
              ? ','
              : ''), // Add comma if there is initially an existing resource and there is currently no inserted resource
        },
      ]);
    }
  }, [editorRef, editorModel]);

  const updateResourceBrowserPosition = useCallback(() => {
    if (editorRef.current) {
      const cursorPosition = editorRef.current.getPosition();
      if (cursorPosition) {
        // Save the cursor position for use in handleIndexSelect
        browserCursorPositionRef.current = cursorPosition;

        const editorCoords = editorRef.current.getDomNode()?.getBoundingClientRect();
        const editorPosition = editorRef.current.getScrolledVisiblePosition(cursorPosition);
        if (editorCoords && editorPosition) {
          const editorTop = editorCoords.top;
          const editorLeft = editorCoords.left;
          // Calculate the absolute position of the popover
          const absoluteTop = editorTop + (editorPosition?.top ?? 0) - 120;
          let absoluteLeft = editorLeft + (editorPosition?.left ?? 0);
          if (absoluteLeft > editorCoords.width) {
            // date picker is out of the editor
            absoluteLeft = absoluteLeft - BROWSER_POPOVER_WIDTH;
          }

          setBrowserPopoverPosition({ top: absoluteTop, left: absoluteLeft });
        }
      }
    }
  }, [editorRef]);

  const openIndicesBrowser = useCallback(() => {
    updateResourceBrowserPosition();
    setIsDataSourceBrowserOpen(true);
  }, [updateResourceBrowserPosition]);

  const openFieldsBrowser = useCallback(async () => {
    if (editorRef.current && editorModel.current) {
      const position = editorRef.current.getPosition();
      if (position) {
        // Use the same logic as autocomplete to get fields
        const fullText = editorModel.current.getValue() || '';
        const offset = editorModel.current.getOffsetAt(position) || 0;
        const innerText = fullText.substring(0, offset);

        // Store the query string for fetching recommended fields
        fieldsBrowserQueryStringRef.current = innerText;
        const correctedQuery = correctQuerySyntax(innerText);
        const { root } = Parser.parse(correctedQuery, { withFormatting: true });
        const astContext = getCursorContext(innerText, root, offset);
        const astForFields = astContext.astForContext;

        const { getColumnMap } = getColumnsByTypeRetriever(
          getQueryForFields(correctedQuery, astForFields),
          innerText,
          esqlCallbacks
        );

        // Store the getColumnMap function in a ref so it can be used by the popup
        fieldsBrowserGetColumnMapRef.current = getColumnMap;
      }
    }
    updateResourceBrowserPosition();
    setIsFieldsBrowserOpen(true);
  }, [esqlCallbacks, updateResourceBrowserPosition, editorRef, editorModel]);

  return {
    isDataSourceBrowserOpen,
    setIsDataSourceBrowserOpen,
    isFieldsBrowserOpen,
    setIsFieldsBrowserOpen,
    browserPopoverPosition,
    fieldsBrowserGetColumnMapRef,
    fieldsBrowserQueryStringRef,
    handleResourceBrowserSelect,
    openIndicesBrowser,
    openFieldsBrowser,
  };
}
