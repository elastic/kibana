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
  // Inherit color mode from the parent app's EUI context
  const { colorMode } = useEuiTheme();
  const colorModeRef = useRef(colorMode);
  colorModeRef.current = colorMode;

  // Mutable state refs (not React state — we render imperatively via root.render)
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

  // ── Update widget state via imperative handle (no root.render() per keystroke) ──

  const render = useCallback(() => {
    handleRef.current?.update({
      items: itemsRef.current,
      filterText: filterTextRef.current,
      selectedIndex: selectedIndexRef.current,
      isVisible: isVisibleRef.current,
    });
  }, []);

  // ── Show / Hide ──

  const showWidget = useCallback(
    (payload: SuggestionsPayload) => {
      if (!editor || !widgetRef.current || !ctxKeyRef.current) return;
      if (payload.items.length === 0) return;

      itemsRef.current = payload.items;
      selectedIndexRef.current = 0;
      anchorPositionRef.current = payload.anchorPosition;

      // Compute initial filterText: the user may have typed characters between
      // the async provider trigger and this callback. Read the text from the
      // anchor column to the current cursor to capture what was typed.
      const pos = editor.getPosition();
      const model = editor.getModel();
      if (pos && model && pos.lineNumber === payload.anchorPosition.lineNumber) {
        const typed = model.getValueInRange({
          startLineNumber: pos.lineNumber,
          startColumn: payload.anchorPosition.column,
          endLineNumber: pos.lineNumber,
          endColumn: pos.column,
        });
        filterTextRef.current = typed;
      } else {
        filterTextRef.current = '';
      }

      // Check if any items match the initial filter — if not, don't show
      const filtered = getFilteredItems(payload.items, filterTextRef.current);
      if (filtered.length === 0) return;

      isVisibleRef.current = true;
      ctxKeyRef.current.set(true);
      widgetRef.current.setAnchorPosition(payload.anchorPosition);
      render();
    },
    [editor, render]
  );

  const hideWidget = useCallback(() => {
    if (!ctxKeyRef.current) return;

    isVisibleRef.current = false;
    anchorPositionRef.current = null;
    filterTextRef.current = '';
    ctxKeyRef.current.set(false);
    clearSuggestions();
    render();
  }, [render]);

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

    const startCol = anchorPositionRef.current?.column ?? pos.column - filterTextRef.current.length;
    const range = new monaco.Range(pos.lineNumber, startCol, pos.lineNumber, pos.column);

    // Suppress onDidChangeModelContent handler during acceptance
    isAcceptingRef.current = true;
    hideWidget();

    // Determine if we should use snippet insertion
    const isSnippet =
      item.insertTextRules !== undefined &&
      // eslint-disable-next-line no-bitwise
      (item.insertTextRules & monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet) !== 0;

    if (isSnippet) {
      // For snippets, use Monaco's built-in snippet insertion
      editor.executeEdits('custom-suggest', [{ range, text: '', forceMoveMarkers: true }]);
      editor.trigger('custom-suggest', 'editor.action.insertSnippet', {
        snippet: item.insertText,
      });
    } else {
      editor.executeEdits('custom-suggest', [
        { range, text: item.insertText, forceMoveMarkers: true },
      ]);
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

    // Create React root on the inner node — render once with EuiProvider + SuggestWidgetRoot.
    // Subsequent updates go through the imperative handle (no root.render per keystroke).
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

    // Create context key for conditional keybindings
    const ctxKey = editor.createContextKey('customSuggestWidgetVisible', false);
    ctxKeyRef.current = ctxKey;

    // ── Register keybindings via addAction (precondition-gated) ──

    disposablesRef.current.push(
      editor.addAction({
        id: 'customSuggest.selectPrevious',
        label: 'Custom Suggest: Select Previous',
        precondition: 'customSuggestWidgetVisible',
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
        precondition: 'customSuggestWidgetVisible',
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
        id: 'customSuggest.accept',
        label: 'Custom Suggest: Accept',
        precondition: 'customSuggestWidgetVisible',
        keybindings: [monaco.KeyCode.Enter, monaco.KeyCode.Tab],
        run: () => {
          acceptSuggestion();
        },
      })
    );

    disposablesRef.current.push(
      editor.addAction({
        id: 'customSuggest.dismiss',
        label: 'Custom Suggest: Dismiss',
        precondition: 'customSuggestWidgetVisible',
        keybindings: [monaco.KeyCode.Escape],
        run: () => {
          hideWidget();
        },
      })
    );

    disposablesRef.current.push(
      editor.addAction({
        id: 'customSuggest.pageUp',
        label: 'Custom Suggest: Page Up',
        precondition: 'customSuggestWidgetVisible',
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
        precondition: 'customSuggestWidgetVisible',
        keybindings: [monaco.KeyCode.PageDown],
        run: () => {
          const filtered = getFilteredItems(itemsRef.current, filterTextRef.current);
          selectedIndexRef.current = Math.min(filtered.length - 1, selectedIndexRef.current + 8);
          render();
        },
      })
    );

    // ── Suppress built-in suggest keybindings when our widget is visible ──

    disposablesRef.current.push(
      monaco.editor.addKeybindingRules([
        {
          keybinding: monaco.KeyCode.Enter,
          command: null,
          when: 'customSuggestWidgetVisible && !suggestWidgetVisible',
        },
        {
          keybinding: monaco.KeyCode.Tab,
          command: null,
          when: 'customSuggestWidgetVisible && !suggestWidgetVisible',
        },
        {
          keybinding: monaco.KeyCode.Escape,
          command: null,
          when: 'customSuggestWidgetVisible && !suggestWidgetVisible',
        },
      ])
    );

    // ── Filter text tracking via onDidChangeModelContent ──

    disposablesRef.current.push(
      editor.onDidChangeModelContent((e) => {
        if (!isVisibleRef.current || isAcceptingRef.current) return;

        for (const change of e.changes) {
          if (change.text.length > 0 && change.rangeLength === 0) {
            // Insertion
            filterTextRef.current += change.text;
          } else if (change.text.length === 0 && change.rangeLength > 0) {
            // Deletion
            filterTextRef.current = filterTextRef.current.slice(
              0,
              Math.max(0, filterTextRef.current.length - change.rangeLength)
            );
          } else if (change.text.length > 0 && change.rangeLength > 0) {
            // Replacement
            filterTextRef.current = filterTextRef.current.slice(
              0,
              Math.max(0, filterTextRef.current.length - change.rangeLength)
            );
            filterTextRef.current += change.text;
          }
        }

        selectedIndexRef.current = 0;

        // Check if there are still matching items
        const filtered = getFilteredItems(itemsRef.current, filterTextRef.current);
        if (filtered.length === 0) {
          hideWidget();
          return;
        }

        // Dismiss if filter emptied from backspace
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

    // ── Dismiss on mouse click in editor ──

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
