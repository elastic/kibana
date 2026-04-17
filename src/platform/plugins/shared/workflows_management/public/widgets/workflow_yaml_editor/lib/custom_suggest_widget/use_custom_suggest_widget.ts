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
import { i18n } from '@kbn/i18n';
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
  //
  // preserve=true soft-hides: visibility goes false but anchor/items/filter are
  // kept so subsequent edits (typically a backspace into a matching prefix) can
  // re-show the widget without requiring a fresh trigger.
  const hideWidget = useCallback(
    (opts?: { preserve?: boolean }) => {
      if (!ctxKeyRef.current) return;

      isVisibleRef.current = false;
      ctxKeyRef.current.set(false);
      render();

      (
        editorRef.current as { setAriaOptions?: (opts: Record<string, unknown>) => void }
      )?.setAriaOptions?.({ activeDescendant: undefined });

      if (!opts?.preserve) {
        anchorPositionRef.current = null;
        filterTextRef.current = '';
        itemsRef.current = [];
        clearSuggestions();
      }
    },
    [render]
  );

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

    // Main replacement range: from the item's startColumn through the current cursor.
    const itemRange = item.range;
    const mainRange = new monaco.Range(
      itemRange.startLineNumber,
      itemRange.startColumn,
      pos.lineNumber,
      pos.column
    );

    // Fold same-line adjacent additionalTextEdits (e.g., removing the @ trigger)
    // into the main range so the insertion is one coherent transaction. Applying
    // them as a second executeEdits breaks because the second call's coordinates
    // don't compose with the first — leaving stray trigger chars like "@workflow".
    let unionRange = mainRange;
    const nonAdjacentEdits: Array<{ range: monaco.IRange; text: string }> = [];
    for (const edit of item.additionalTextEdits ?? []) {
      const r = monaco.Range.lift(edit.range);
      const text = edit.text ?? '';
      const adjacent =
        r.startLineNumber === mainRange.startLineNumber &&
        r.endLineNumber === mainRange.endLineNumber &&
        text === '' &&
        r.endColumn >= unionRange.startColumn &&
        r.startColumn <= unionRange.endColumn;
      if (adjacent) {
        unionRange = new monaco.Range(
          unionRange.startLineNumber,
          Math.min(unionRange.startColumn, r.startColumn),
          unionRange.endLineNumber,
          Math.max(unionRange.endColumn, r.endColumn)
        );
      } else {
        nonAdjacentEdits.push({ range: r, text });
      }
    }

    const isSnippet =
      item.insertTextRules !== undefined &&
      // eslint-disable-next-line no-bitwise
      (item.insertTextRules & monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet) !== 0;

    // snippetController2 is loaded by Kibana's Monaco build; editor.action.insertSnippet
    // needs a separate contribution and isn't reliably available here.
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
      snippetController.insert(item.insertText, {
        overwriteBefore: pos.column - unionRange.startColumn,
        overwriteAfter: Math.max(0, unionRange.endColumn - pos.column),
        undoStopBefore: true,
        undoStopAfter: true,
        adjustWhitespace: true,
      });
    } else {
      const plainText = isSnippet ? stripSnippetPlaceholders(item.insertText) : item.insertText;
      editor.executeEdits('custom-suggest', [
        { range: unionRange, text: plainText, forceMoveMarkers: true },
      ]);
    }

    if (nonAdjacentEdits.length) {
      editor.executeEdits(
        'custom-suggest-additional',
        nonAdjacentEdits.map((e) => ({ range: e.range, text: e.text, forceMoveMarkers: true }))
      );
    }

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
    // All keybindings go through addAction so they return IDisposable and are
    // cleaned up on unmount. The `precondition` gates on the context key so
    // default Monaco handlers (Enter/Tab type, Escape exit-edit-mode) stay
    // active when the widget is hidden.
    const addKeyAction = (
      id: string,
      label: string,
      keybindings: number[],
      run: () => void
    ): void => {
      disposablesRef.current.push(
        editor.addAction({ id, label, precondition: CONTEXT_KEY, keybindings, run })
      );
    };

    addKeyAction(
      'customSuggest.accept',
      i18n.translate('workflows.yamlEditor.suggest.accept', {
        defaultMessage: 'Accept suggestion',
      }),
      [monaco.KeyCode.Enter],
      () => acceptSuggestion()
    );
    addKeyAction(
      'customSuggest.acceptTab',
      i18n.translate('workflows.yamlEditor.suggest.acceptTab', {
        defaultMessage: 'Accept suggestion (Tab)',
      }),
      [monaco.KeyCode.Tab],
      () => acceptSuggestion()
    );
    // Escape is handled via onKeyDown rather than addAction: the shared CodeEditor
    // wrapper listens on onKeyDown and exits edit mode on ESC. Our addAction fires
    // through a separate pipeline, so the wrapper runs first and stopPropagation
    // prevents our handler from firing. Intercepting in onKeyDown lets us
    // preventDefault + stopPropagation before the wrapper decides to exit edit mode.
    disposablesRef.current.push(
      editor.onKeyDown((e) => {
        if (e.keyCode !== monaco.KeyCode.Escape) return;
        if (!isVisibleRef.current && !anchorPositionRef.current) return;
        e.preventDefault();
        e.stopPropagation();
        hideWidget();
      })
    );
    addKeyAction(
      'customSuggest.selectPrevious',
      i18n.translate('workflows.yamlEditor.suggest.selectPrevious', {
        defaultMessage: 'Select previous suggestion',
      }),
      [monaco.KeyCode.UpArrow],
      () => {
        selectedIndexRef.current = Math.max(0, selectedIndexRef.current - 1);
        render();
      }
    );
    addKeyAction(
      'customSuggest.selectNext',
      i18n.translate('workflows.yamlEditor.suggest.selectNext', {
        defaultMessage: 'Select next suggestion',
      }),
      [monaco.KeyCode.DownArrow],
      () => {
        const filtered = getFilteredItems(itemsRef.current, filterTextRef.current);
        selectedIndexRef.current = Math.min(filtered.length - 1, selectedIndexRef.current + 1);
        render();
      }
    );
    addKeyAction(
      'customSuggest.pageUp',
      i18n.translate('workflows.yamlEditor.suggest.pageUp', {
        defaultMessage: 'Page up in suggestions',
      }),
      [monaco.KeyCode.PageUp],
      () => {
        selectedIndexRef.current = Math.max(0, selectedIndexRef.current - 8);
        render();
      }
    );
    addKeyAction(
      'customSuggest.pageDown',
      i18n.translate('workflows.yamlEditor.suggest.pageDown', {
        defaultMessage: 'Page down in suggestions',
      }),
      [monaco.KeyCode.PageDown],
      () => {
        const filtered = getFilteredItems(itemsRef.current, filterTextRef.current);
        selectedIndexRef.current = Math.min(filtered.length - 1, selectedIndexRef.current + 8);
        render();
      }
    );

    // ── Filter text tracking via onDidChangeModelContent ──
    //
    // Derive filter text from the live anchor→cursor range rather than diffing
    // change events: one source of truth, and it keeps working across paste,
    // IME composition, and programmatic edits. While the anchor is set we also
    // process changes when the widget is soft-hidden, so typing into a new
    // matching prefix (e.g. backspacing after a typo) reopens the widget.

    disposablesRef.current.push(
      editor.onDidChangeModelContent(() => {
        if (isAcceptingRef.current) return;
        const anchor = anchorPositionRef.current;
        if (!anchor) return;

        const pos = editor.getPosition();
        const model = editor.getModel();
        if (!pos || !model || pos.lineNumber !== anchor.lineNumber) {
          hideWidget();
          return;
        }
        if (pos.column < anchor.column) {
          hideWidget();
          return;
        }

        filterTextRef.current = model.getValueInRange({
          startLineNumber: anchor.lineNumber,
          startColumn: anchor.column,
          endLineNumber: pos.lineNumber,
          endColumn: pos.column,
        });
        selectedIndexRef.current = 0;

        const filtered = getFilteredItems(itemsRef.current, filterTextRef.current);
        if (filtered.length === 0) {
          // Soft hide — keep anchor/items so further editing can restore.
          hideWidget({ preserve: true });
          return;
        }

        if (!isVisibleRef.current) {
          isVisibleRef.current = true;
          ctxKeyRef.current?.set(true);
        }
        render();
      })
    );

    // ── Dismiss on cursor moving to a different line ──

    disposablesRef.current.push(
      editor.onDidChangeCursorPosition((e) => {
        if (!anchorPositionRef.current) return;
        if (e.position.lineNumber !== anchorPositionRef.current.lineNumber) {
          hideWidget();
        }
      })
    );

    // ── Dismiss on mouse click in editor (but not on widget) ──

    disposablesRef.current.push(
      editor.onMouseDown(() => {
        if (isVisibleRef.current || anchorPositionRef.current) {
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
    //
    // The emitter is a module-level singleton that may receive payloads from
    // other workflow editor instances; filter by modelUri so each editor only
    // reacts to its own suggestions.
    const ownModelUri = editor.getModel()?.uri.toString();
    const unsubscribe = subscribeSuggestions((payload) => {
      if (ownModelUri && payload.modelUri !== ownModelUri) return;
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
