/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEuiTheme } from '@elastic/eui';
import { useCallback, useEffect, useRef } from 'react';
import { monaco } from '@kbn/monaco';

import { planAcceptRange, toMonacoEdits } from './accept_range';
import { clearSuggestions, subscribeSuggestions } from './enriched_suggestion_store';
import { type MountedSuggestWidget, mountSuggestWidget } from './mount_widget_react';
import { registerKeybindings } from './register_keybindings';
import { getFilteredItems } from './suggest_list_panel';
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
 * Orchestrates three separated concerns:
 *  - `mountSuggestWidget` creates the IContentWidget + React root.
 *  - `registerKeybindings` wires Enter/Tab/Arrow/PgUp/PgDn/Escape.
 *  - `planAcceptRange` folds additionalTextEdits into the main edit so
 *    accepting after an `@` trigger cleans up the trigger character.
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

  const mountedRef = useRef<MountedSuggestWidget | null>(null);
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

  const render = useCallback(() => {
    mountedRef.current?.getHandle()?.update({
      items: itemsRef.current,
      filterText: filterTextRef.current,
      selectedIndex: selectedIndexRef.current,
      isVisible: isVisibleRef.current,
    });
  }, []);

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

  const showWidget = useCallback(
    (payload: SuggestionsPayload) => {
      if (!editor || !mountedRef.current || !ctxKeyRef.current) return;
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
      mountedRef.current.widget.setAnchorPosition(payload.anchorPosition);
      render();
    },
    [editor, render, hideWidget]
  );

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

    const plan = planAcceptRange(item.range, pos, item.additionalTextEdits);
    const { mainRange: unionRange, nonAdjacent } = toMonacoEdits(plan, monaco);

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

    if (nonAdjacent.length) {
      editor.executeEdits(
        'custom-suggest-additional',
        nonAdjacent.map((e) => ({ range: e.range, text: e.text, forceMoveMarkers: true }))
      );
    }

    if (item.command) {
      const args = item.command.arguments?.[0];
      editor.trigger('custom-suggest', item.command.id, args);
    }

    isAcceptingRef.current = false;
    editor.focus();
  }, [editor, hideWidget]);

  useEffect(() => {
    if (!editor || !isEditorMounted) return;

    const mounted = mountSuggestWidget(editor, {
      colorMode: colorModeRef.current === 'DARK' ? 'dark' : 'light',
      onSelect: (index: number) => {
        selectedIndexRef.current = index;
        render();
      },
      onAccept: (index: number) => {
        selectedIndexRef.current = index;
        acceptSuggestion();
      },
    });
    mountedRef.current = mounted;

    const ctxKey = editor.createContextKey(CONTEXT_KEY, false);
    ctxKeyRef.current = ctxKey;

    disposablesRef.current.push(
      ...registerKeybindings(editor, CONTEXT_KEY, {
        accept: acceptSuggestion,
        selectPrevious: () => {
          selectedIndexRef.current = Math.max(0, selectedIndexRef.current - 1);
          render();
        },
        selectNext: () => {
          const filtered = getFilteredItems(itemsRef.current, filterTextRef.current);
          selectedIndexRef.current = Math.min(filtered.length - 1, selectedIndexRef.current + 1);
          render();
        },
        pageUp: () => {
          selectedIndexRef.current = Math.max(0, selectedIndexRef.current - 8);
          render();
        },
        pageDown: () => {
          const filtered = getFilteredItems(itemsRef.current, filterTextRef.current);
          selectedIndexRef.current = Math.min(filtered.length - 1, selectedIndexRef.current + 8);
          render();
        },
        onEscape: () => {
          if (!isVisibleRef.current && !anchorPositionRef.current) return false;
          hideWidget();
          return true;
        },
      })
    );

    // Filter text tracking. Derive from the live anchor→cursor range rather
    // than diffing change events: one source of truth, and keeps working across
    // paste, IME composition, and programmatic edits. While the anchor is set
    // we also process changes when the widget is soft-hidden, so typing into a
    // new matching prefix (e.g. backspacing after a typo) reopens the widget.
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

    disposablesRef.current.push(
      editor.onDidChangeCursorPosition((e) => {
        if (!anchorPositionRef.current) return;
        if (e.position.lineNumber !== anchorPositionRef.current.lineNumber) {
          hideWidget();
        }
      })
    );

    disposablesRef.current.push(
      editor.onMouseDown(() => {
        if (isVisibleRef.current || anchorPositionRef.current) {
          hideWidget();
        }
      })
    );

    disposablesRef.current.push(
      editor.onDidScrollChange(() => {
        if (isVisibleRef.current && mountedRef.current) {
          editor.layoutContentWidget(mountedRef.current.widget);
        }
      })
    );

    // Subscribe to enriched suggestions from the completion provider.
    // The emitter is a module-level singleton that may receive payloads from
    // other workflow editor instances; filter by modelUri so each editor only
    // reacts to its own suggestions.
    const ownModelUri = editor.getModel()?.uri.toString();
    const unsubscribe = subscribeSuggestions((payload) => {
      if (ownModelUri && payload.modelUri !== ownModelUri) return;
      showWidget(payload);
    });

    return () => {
      unsubscribe();
      for (const d of disposablesRef.current) {
        d.dispose();
      }
      disposablesRef.current = [];
      mounted.dispose();
      mountedRef.current = null;
      ctxKeyRef.current = null;
    };
  }, [editor, isEditorMounted, render, showWidget, hideWidget, acceptSuggestion]);
};
