/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiProvider, useEuiTheme } from '@elastic/eui';
import React, { useCallback, useEffect, useRef } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { monaco } from '@kbn/monaco';

import { clearSuggestions, subscribeSuggestions } from './enriched_suggestion_store';
import { SuggestContentWidget } from './suggest_content_widget';
import { getFilteredItems } from './suggest_list_panel';
import { type SuggestWidgetHandle, SuggestWidgetRoot } from './suggest_widget_root';
import type { EnrichedSuggestionItem, SuggestionsPayload } from './types';

const CONTEXT_KEY = 'customSuggestWidgetVisible';

/**
 * Strip snippet placeholders for plain-text insertion.
 * ${1:default} → default, $1 → '', $0 → ''
 */
const stripSnippetPlaceholders = (text: string): string =>
  text.replace(/\$\{\d+:([^}]*)\}/g, '$1').replace(/\$\d+/g, '');

/**
 * Hook that manages the custom suggest widget lifecycle.
 *
 * Creates an IContentWidget, registers context keys and keybindings,
 * subscribes to the enriched suggestion store, and renders a React
 * component into the widget's DOM node.
 *
 * Only used in the workflow YAML editor — other Monaco consumers are unaffected.
 */
export const useCustomSuggestWidget = (
  editor: monaco.editor.IStandaloneCodeEditor | null,
  isEditorMounted: boolean
): void => {
  const { colorMode } = useEuiTheme();
  const colorModeRef = useRef(colorMode);
  colorModeRef.current = colorMode;

  const widgetRef = useRef<SuggestContentWidget | null>(null);
  const rootRef = useRef<Root | null>(null);
  const handleRef = useRef<SuggestWidgetHandle | null>(null);
  const ctxKeyRef = useRef<monaco.editor.IContextKey<boolean> | null>(null);
  const disposablesRef = useRef<monaco.IDisposable[]>([]);

  const itemsRef = useRef<EnrichedSuggestionItem[]>([]);
  const filterTextRef = useRef('');
  const selectedIndexRef = useRef(0);
  const anchorPositionRef = useRef<{ lineNumber: number; column: number } | null>(null);
  const isVisibleRef = useRef(false);
  const isAcceptingRef = useRef(false);
  const editorRef = useRef(editor);
  editorRef.current = editor;

  // ── Update widget state via imperative handle ──

  const render = useCallback(() => {
    handleRef.current?.update({
      items: itemsRef.current,
      filterText: filterTextRef.current,
      selectedIndex: selectedIndexRef.current,
      isVisible: isVisibleRef.current,
    });
  }, []);

  // ── Hide ──

  const hideWidget = useCallback(() => {
    if (!ctxKeyRef.current) return;

    isVisibleRef.current = false;
    anchorPositionRef.current = null;
    filterTextRef.current = '';
    ctxKeyRef.current.set(false);
    clearSuggestions();
    render();

    // Clear aria active descendant (setAriaOptions is available on internal editor API)
    (
      editorRef.current as { setAriaOptions?: (opts: Record<string, unknown>) => void }
    )?.setAriaOptions?.({ activeDescendant: undefined });
  }, [render]);

  // ── Show ──

  const showWidget = useCallback(
    (payload: SuggestionsPayload) => {
      if (!editor || !widgetRef.current || !ctxKeyRef.current) return;
      if (payload.items.length === 0) {
        if (isVisibleRef.current) hideWidget();
        return;
      }

      // If already visible on same line, update items without reset (prevents blink)
      const sameLine =
        isVisibleRef.current &&
        anchorPositionRef.current?.lineNumber === payload.anchorPosition.lineNumber;

      if (sameLine) {
        itemsRef.current = payload.items;
        const filtered = getFilteredItems(payload.items, filterTextRef.current);
        if (filtered.length === 0) {
          hideWidget();
          return;
        }
        render();
        return;
      }

      // Fresh show
      itemsRef.current = payload.items;
      selectedIndexRef.current = 0;
      anchorPositionRef.current = payload.anchorPosition;

      // Compute initial filterText from anchor to current cursor (async gap)
      const pos = editor.getPosition();
      const model = editor.getModel();
      if (pos && model && pos.lineNumber === payload.anchorPosition.lineNumber) {
        filterTextRef.current = model.getValueInRange({
          startLineNumber: pos.lineNumber,
          startColumn: payload.anchorPosition.column,
          endLineNumber: pos.lineNumber,
          endColumn: pos.column,
        });
      } else {
        filterTextRef.current = '';
      }

      const filtered = getFilteredItems(payload.items, filterTextRef.current);
      if (filtered.length === 0) return;

      isVisibleRef.current = true;
      ctxKeyRef.current.set(true);
      widgetRef.current.setAnchorPosition(payload.anchorPosition);
      render();
    },
    [editor, render, hideWidget]
  );

  // ── Accept suggestion ──

  const acceptSuggestion = useCallback(() => {
    if (!editor) return;

    const filtered = getFilteredItems(itemsRef.current, filterTextRef.current);
    const idx = Math.max(0, Math.min(selectedIndexRef.current, filtered.length - 1));
    const entry = filtered[idx];
    if (!entry) return;

    const { item } = entry;
    const pos = editor.getPosition();
    if (!pos) return;

    isAcceptingRef.current = true;
    hideWidget();

    // Use the completion item's range for correct replacement.
    // The range specifies what text to replace (e.g., the word being typed).
    // Adjust endColumn to current cursor to account for typed characters.
    const itemRange = item.range;
    const range = new monaco.Range(
      itemRange.startLineNumber,
      itemRange.startColumn,
      pos.lineNumber,
      pos.column
    );

    // Try snippetController2 for snippet insertions (it IS loaded in Kibana,
    // unlike the editor.action.insertSnippet action which requires a separate contribution)
    const isSnippet =
      item.insertTextRules !== undefined &&
      // eslint-disable-next-line no-bitwise
      (item.insertTextRules & monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet) !== 0;

    const snippetController = editor.getContribution('snippetController2') as {
      insert?: (
        template: string,
        opts?: {
          overwriteBefore?: number;
          overwriteAfter?: number;
          undoStopBefore?: boolean;
          undoStopAfter?: boolean;
          adjustWhitespace?: boolean;
        }
      ) => void;
    } | null;

    if (isSnippet && snippetController?.insert) {
      const overwriteBefore = pos.column - itemRange.startColumn;
      snippetController.insert(item.insertText, {
        overwriteBefore,
        overwriteAfter: 0,
        undoStopBefore: true,
        undoStopAfter: true,
        adjustWhitespace: true,
      });
    } else {
      // Plain text — strip any snippet placeholders just in case
      const plainText = isSnippet ? stripSnippetPlaceholders(item.insertText) : item.insertText;
      editor.executeEdits('custom-suggest', [{ range, text: plainText, forceMoveMarkers: true }]);
    }

    // Apply additional text edits (e.g., removing @ trigger character)
    if (item.additionalTextEdits?.length) {
      const edits = item.additionalTextEdits.map((edit) => ({
        range: monaco.Range.lift(edit.range),
        text: edit.text,
        forceMoveMarkers: true,
      }));
      editor.executeEdits('custom-suggest-additional', edits);
    }

    // Execute post-accept command if present (e.g., create connector)
    if (item.command) {
      const args = item.command.arguments?.[0];
      editor.trigger('custom-suggest', item.command.id, args);
    }

    isAcceptingRef.current = false;
    editor.focus();
  }, [editor, hideWidget]);

  // ── Setup effect ──

  useEffect(() => {
    if (!editor || !isEditorMounted) return;

    // Create the IContentWidget
    const widget = new SuggestContentWidget(editor);
    widgetRef.current = widget;

    // Create React root — EuiProvider is created once, updates go through handle
    const root = createRoot(widget.getInnerNode());
    rootRef.current = root;

    const refCallback = (handle: SuggestWidgetHandle | null) => {
      handleRef.current = handle;
    };

    root.render(
      React.createElement(
        EuiProvider,
        { colorMode: colorModeRef.current === 'DARK' ? 'dark' : 'light' },
        React.createElement(SuggestWidgetRoot, {
          ref: refCallback,
          onSelect: (index: number) => {
            selectedIndexRef.current = index;
            render();
          },
          onAccept: (index: number) => {
            selectedIndexRef.current = index;
            acceptSuggestion();
          },
        })
      )
    );

    // Context key for conditional keybindings
    const ctxKey = editor.createContextKey(CONTEXT_KEY, false);
    ctxKeyRef.current = ctxKey;

    // ── Keybindings ──
    // Use addCommand for Enter/Tab (these conflict with the `type` command path).
    // addCommand with a context string doesn't add `editorId` scoping, making it
    // simpler and more reliable than addAction for keys that go through the `type` path.

    const enterCmdId = editor.addCommand(
      monaco.KeyCode.Enter,
      () => acceptSuggestion(),
      CONTEXT_KEY
    );
    if (enterCmdId) disposablesRef.current.push({ dispose: () => {} });

    const tabCmdId = editor.addCommand(monaco.KeyCode.Tab, () => acceptSuggestion(), CONTEXT_KEY);
    if (tabCmdId) disposablesRef.current.push({ dispose: () => {} });

    const escapeCmdId = editor.addCommand(monaco.KeyCode.Escape, () => hideWidget(), CONTEXT_KEY);
    if (escapeCmdId) disposablesRef.current.push({ dispose: () => {} });

    // Use addAction for arrow keys (these don't conflict with the `type` command)
    disposablesRef.current.push(
      editor.addAction({
        id: 'customSuggest.selectPrevious',
        label: 'Custom Suggest: Select Previous',
        precondition: CONTEXT_KEY,
        keybindings: [monaco.KeyCode.UpArrow],
        run: () => {
          selectedIndexRef.current = Math.max(0, selectedIndexRef.current - 1);
          render();
        },
      })
    );

    disposablesRef.current.push(
      editor.addAction({
        id: 'customSuggest.selectNext',
        label: 'Custom Suggest: Select Next',
        precondition: CONTEXT_KEY,
        keybindings: [monaco.KeyCode.DownArrow],
        run: () => {
          const filtered = getFilteredItems(itemsRef.current, filterTextRef.current);
          selectedIndexRef.current = Math.min(filtered.length - 1, selectedIndexRef.current + 1);
          render();
        },
      })
    );

    disposablesRef.current.push(
      editor.addAction({
        id: 'customSuggest.pageUp',
        label: 'Custom Suggest: Page Up',
        precondition: CONTEXT_KEY,
        keybindings: [monaco.KeyCode.PageUp],
        run: () => {
          selectedIndexRef.current = Math.max(0, selectedIndexRef.current - 8);
          render();
        },
      })
    );

    disposablesRef.current.push(
      editor.addAction({
        id: 'customSuggest.pageDown',
        label: 'Custom Suggest: Page Down',
        precondition: CONTEXT_KEY,
        keybindings: [monaco.KeyCode.PageDown],
        run: () => {
          const filtered = getFilteredItems(itemsRef.current, filterTextRef.current);
          selectedIndexRef.current = Math.min(filtered.length - 1, selectedIndexRef.current + 8);
          render();
        },
      })
    );

    // NOTE: No addKeybindingRules with command:null — they shadow the addCommand handlers

    // ── Filter text tracking via onDidChangeModelContent ──

    disposablesRef.current.push(
      editor.onDidChangeModelContent((e) => {
        if (!isVisibleRef.current || isAcceptingRef.current) return;

        for (const change of e.changes) {
          if (change.text.length > 0 && change.rangeLength === 0) {
            filterTextRef.current += change.text;
          } else if (change.text.length === 0 && change.rangeLength > 0) {
            filterTextRef.current = filterTextRef.current.slice(
              0,
              Math.max(0, filterTextRef.current.length - change.rangeLength)
            );
          } else if (change.text.length > 0 && change.rangeLength > 0) {
            filterTextRef.current = filterTextRef.current.slice(
              0,
              Math.max(0, filterTextRef.current.length - change.rangeLength)
            );
            filterTextRef.current += change.text;
          }
        }

        selectedIndexRef.current = 0;

        const filtered = getFilteredItems(itemsRef.current, filterTextRef.current);
        if (filtered.length === 0) {
          hideWidget();
          return;
        }

        if (filterTextRef.current.length === 0 && e.changes.some((c) => c.rangeLength > 0)) {
          hideWidget();
          return;
        }

        render();
      })
    );

    // ── Dismiss on cursor moving to a different line ──

    disposablesRef.current.push(
      editor.onDidChangeCursorPosition((e) => {
        if (!isVisibleRef.current) return;
        if (
          anchorPositionRef.current &&
          e.position.lineNumber !== anchorPositionRef.current.lineNumber
        ) {
          hideWidget();
        }
      })
    );

    // ── Dismiss on mouse click in editor (but not on widget) ──

    disposablesRef.current.push(
      editor.onMouseDown(() => {
        if (isVisibleRef.current) {
          hideWidget();
        }
      })
    );

    // ── Reposition on scroll ──

    disposablesRef.current.push(
      editor.onDidScrollChange(() => {
        if (isVisibleRef.current && widgetRef.current) {
          editor.layoutContentWidget(widgetRef.current);
        }
      })
    );

    // ── Subscribe to enriched suggestions from the completion provider ──

    const unsubscribe = subscribeSuggestions((payload) => {
      showWidget(payload);
    });

    // ── Cleanup ──

    return () => {
      unsubscribe();
      for (const d of disposablesRef.current) {
        d.dispose();
      }
      disposablesRef.current = [];
      root.unmount();
      rootRef.current = null;
      widget.dispose();
      widgetRef.current = null;
      ctxKeyRef.current = null;
    };
  }, [editor, isEditorMounted, render, showWidget, hideWidget, acceptSuggestion]);
};
