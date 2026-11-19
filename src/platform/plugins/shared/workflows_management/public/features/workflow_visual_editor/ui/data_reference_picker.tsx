/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiFieldSearch, EuiPopover, useEuiTheme } from '@elastic/eui';
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { i18n } from '@kbn/i18n';
import type { NavigableEntry } from './data_reference_picker_parts';
import {
  getNavigableEntries,
  getVisibleRows,
  PickerFooter,
  PickerHeader,
  ReferenceList,
} from './data_reference_picker_parts';
import { getInputCaretCoordinates } from './get_input_caret_coordinates';
import type {
  DataReferenceCatalog,
  DataReferenceGroupId,
  DataReferenceItem,
} from '../lib/build_data_reference_catalog';
import {
  formatDataReferenceToken,
  isDataReferenceInsertable,
} from '../lib/build_data_reference_catalog';

const PICKER_MAX_HEIGHT = 400;
/** Fixed floating-layer width — must not match the panel field width. */
const PICKER_WIDTH = 340;
/** A key press forwarded from the editor the typeahead belongs to. */
export interface TypeaheadKeyEvent {
  readonly key: string;
  /** The key belongs to an input method composition, so it is not the dropdown's. */
  readonly isComposing?: boolean;
  readonly preventDefault: () => void;
}

/**
 * The picker as a dropdown under a field that is being typed in, instead of a popover of its own:
 * what was typed after the trigger filters the list, the editor keeps the focus and sends its keys
 * through `keyHandlerRef`. The handler returns true when it used the key.
 */
export interface DataReferenceTypeahead {
  readonly query: string;
  /**
   * Where to open, in px from the top-left of the field: under the cursor of a multi-line editor.
   * Unset, the dropdown opens under the control.
   */
  readonly anchor?: { readonly top: number; readonly left: number };
  readonly keyHandlerRef: React.MutableRefObject<((event: TypeaheadKeyEvent) => boolean) | null>;
}

export interface DataReferencePickerProps {
  readonly catalog: DataReferenceCatalog;
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly onInsert: (token: string) => void;
  /** Anchor field — picker floats under it; does not resize to match field width. */
  readonly input: React.ReactElement;
  /**
   * Stretch the anchor to fill its parent height (field-editor pane). Inline
   * form fields leave this unset so the popover sizes to the control.
   */
  readonly fillHeight?: boolean;
  /** Set to open as a typeahead (no search box, no focus change); unset for the search popover. */
  readonly typeahead?: DataReferenceTypeahead;
  readonly 'data-test-subj'?: string;
}

interface Spot {
  readonly top: number | string;
  readonly left: number | string;
  readonly height: number | string;
}

/**
 * Where the popover box sits, which is what the popover places its panel from (below its
 * bottom-left corner). A typeahead goes where it is given; with none the box spans the control, so
 * the panel opens under it. The position is there from the first render, when the popover reads it.
 */
const popoverBoxPosition = (
  anchor: DataReferenceTypeahead['anchor'],
  underControl: boolean
): Spot =>
  anchor
    ? { top: anchor.top, left: anchor.left, height: 0 }
    : { top: 0, left: 0, height: underControl ? '100%' : 0 };

/**
 * The caret anchor of an explicit picker, measured once it is laid out. A typeahead is placed by
 * its popover box instead.
 */
const caretSpot = (
  isTypeahead: boolean,
  caretAnchor: { top: number; left: number; height: number } | null
): Spot =>
  isTypeahead
    ? { top: 0, left: 0, height: 0 }
    : {
        top: caretAnchor?.top ?? 0,
        left: caretAnchor?.left ?? 0,
        height: caretAnchor?.height ?? 1,
      };

/**
 * On-demand data reference popover — search, drill, keyboard insert.
 * Floating ~340px layer under the field; does not reflow the form panel.
 */
export function DataReferencePicker({
  catalog,
  isOpen,
  onClose,
  onInsert,
  input,
  fillHeight = false,
  typeahead,
  'data-test-subj': dataTestSubj = 'workflowDataReferencePicker',
}: DataReferencePickerProps) {
  const { euiTheme } = useEuiTheme();
  const searchRef = useRef<HTMLInputElement | null>(null);
  const panelElRef = useRef<HTMLElement | null>(null);
  const inputElRef = useRef<HTMLElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [typedSearch, setSearch] = useState('');
  const isTypeahead = typeahead !== undefined;
  const search = typeahead ? typeahead.query : typedSearch;
  // A dropdown opens at the point it is given, or else under the control, not over the text being
  // typed in. The caret of a popover for an input is measured below.
  const typeaheadAnchor = typeahead?.anchor;
  const underControl = isTypeahead && typeaheadAnchor === undefined;
  const [drillStack, setDrillStack] = useState<DataReferenceItem[]>([]);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const highlightedRowRef = useRef<HTMLButtonElement | null>(null);
  // Only the keys move the list under the user's eyes; hovering a row must not scroll it.
  const scrollToHighlightRef = useRef(false);
  const [expandedGroups, setExpandedGroups] = useState<ReadonlySet<DataReferenceGroupId>>(
    () => new Set()
  );
  /** Caret-relative anchor inside the field wrapper so the popover sits under `@` / `{{`. */
  const [caretAnchor, setCaretAnchor] = useState<{
    top: number;
    left: number;
    height: number;
  } | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setSearch('');
      setDrillStack([]);
      setHighlightIndex(0);
      setExpandedGroups(new Set());
      setCaretAnchor(null);
      return;
    }
    // A typeahead leaves the focus in the editor the user is typing in.
    if (isTypeahead) return;
    const id = window.setTimeout(() => searchRef.current?.focus(), 0);
    return () => window.clearTimeout(id);
  }, [isOpen, isTypeahead]);

  // Position the popover under the caret (not the full field bbox). Critical for
  // the expanded editor where the textarea fills the pane — downLeft on that
  // box lands far from where the user typed `@`.
  useLayoutEffect(() => {
    if (!isOpen || isTypeahead) return;

    const findField = (): HTMLInputElement | HTMLTextAreaElement | null => {
      const root = inputElRef.current;
      if (!root) return null;
      if (root instanceof HTMLInputElement || root instanceof HTMLTextAreaElement) return root;
      return root.querySelector('textarea, input');
    };

    const updateAnchor = () => {
      const field = findField();
      const wrapper = wrapperRef.current;
      if (!field || !wrapper) return;

      const caret = field.selectionStart ?? field.value.length;
      const coords = getInputCaretCoordinates(field, caret);
      const fieldRect = field.getBoundingClientRect();
      const wrapperRect = wrapper.getBoundingClientRect();

      // Convert caret coords (relative to the field, including scrolled content)
      // into absolute offsets within the position:relative wrapper.
      setCaretAnchor({
        top: fieldRect.top - wrapperRect.top + coords.top - field.scrollTop,
        left: fieldRect.left - wrapperRect.left + coords.left - field.scrollLeft,
        height: coords.height,
      });
    };

    updateAnchor();
    const field = findField();
    field?.addEventListener('scroll', updateAnchor, { passive: true });
    return () => {
      field?.removeEventListener('scroll', updateAnchor);
    };
  }, [isOpen, isTypeahead]);

  // Close when an ancestor of the anchor scrolls (e.g. the config panel body).
  useEffect(() => {
    if (!isOpen) return;
    const closePopoverOnScroll = (event: Event) => {
      const scrollTarget = event.target;
      const panelEl = panelElRef.current;
      const inputEl = inputElRef.current;
      if (!panelEl || !inputEl || !(scrollTarget instanceof Node)) return;
      if (panelEl.contains(scrollTarget) || inputEl.contains(scrollTarget)) return;
      // Field scroll repositions the caret anchor — don't close for that.
      if (scrollTarget instanceof Element && inputEl.contains(scrollTarget)) return;
      if (scrollTarget instanceof Element && !scrollTarget.contains(inputEl)) return;
      onClose();
    };
    const timeoutId = window.setTimeout(() => {
      window.addEventListener('scroll', closePopoverOnScroll, {
        passive: true,
        capture: true,
      });
    }, 500);
    return () => {
      window.clearTimeout(timeoutId);
      window.removeEventListener('scroll', closePopoverOnScroll, { capture: true });
    };
  }, [isOpen, onClose]);

  const drilledItem = drillStack.length > 0 ? drillStack[drillStack.length - 1] : undefined;

  const visibleRows = useMemo(
    () => getVisibleRows(catalog, search, drilledItem),
    [catalog, drilledItem, search]
  );

  const flatNavigable = useMemo(
    () => getNavigableEntries(visibleRows, expandedGroups),
    [expandedGroups, visibleRows]
  );

  useEffect(() => {
    setHighlightIndex(0);
  }, [search, drillStack, isOpen, expandedGroups]);

  useEffect(() => {
    if (!scrollToHighlightRef.current) return;
    scrollToHighlightRef.current = false;
    highlightedRowRef.current?.scrollIntoView?.({ block: 'nearest' });
  }, [highlightIndex]);

  const toggleGroupExpanded = useCallback((groupId: DataReferenceGroupId) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  }, []);

  const insertItem = useCallback(
    (item: DataReferenceItem) => {
      if (item.drillable && item.children?.length) {
        setDrillStack((stack) => [...stack, item]);
        setSearch('');
        return;
      }
      if (!isDataReferenceInsertable(item)) return;
      onInsert(formatDataReferenceToken(item.path));
      onClose();
    },
    [onClose, onInsert]
  );

  const activateEntry = useCallback(
    (entry: NavigableEntry | undefined) => {
      if (!entry) return;
      if (entry.kind === 'expander') {
        toggleGroupExpanded(entry.groupId);
        return;
      }
      insertItem(entry.item);
    },
    [insertItem, toggleGroupExpanded]
  );

  const handleEditorKey = useCallback(
    (event: TypeaheadKeyEvent): boolean => {
      // With the dropdown closed, or nothing listed in it, it is not on screen: the keys are the
      // editor's (a new line in a multi-line editor, Escape to leave it).
      if (!isOpen || flatNavigable.length === 0 || event.isComposing) return false;
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return true;
      }
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        const step = event.key === 'ArrowDown' ? 1 : -1;
        scrollToHighlightRef.current = true;
        setHighlightIndex((i) => Math.max(0, Math.min(i + step, flatNavigable.length - 1)));
        return true;
      }
      if (event.key === 'Enter' || event.key === 'Tab') {
        event.preventDefault();
        activateEntry(flatNavigable[highlightIndex]);
        return true;
      }
      return false;
    },
    [activateEntry, flatNavigable, highlightIndex, isOpen, onClose]
  );

  const keyHandlerRef = typeahead?.keyHandlerRef;
  useEffect(() => {
    if (!keyHandlerRef) return;
    keyHandlerRef.current = handleEditorKey;
    return () => {
      keyHandlerRef.current = null;
    };
  }, [keyHandlerRef, handleEditorKey]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.nativeEvent.isComposing) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        if (drillStack.length > 0 && !search) {
          setDrillStack((stack) => stack.slice(0, -1));
          return;
        }
        onClose();
        return;
      }
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        scrollToHighlightRef.current = true;
        setHighlightIndex((i) => Math.min(i + 1, Math.max(flatNavigable.length - 1, 0)));
        return;
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        scrollToHighlightRef.current = true;
        setHighlightIndex((i) => Math.max(i - 1, 0));
        return;
      }
      if (event.key === 'Enter') {
        event.preventDefault();
        activateEntry(flatNavigable[highlightIndex]);
      }
      if (event.key === 'Backspace' && !search && drillStack.length > 0) {
        const target = event.target as HTMLInputElement;
        if (target.selectionStart === 0 && target.selectionEnd === 0) {
          event.preventDefault();
          setDrillStack((stack) => stack.slice(0, -1));
        }
      }
    },
    [activateEntry, drillStack.length, flatNavigable, highlightIndex, onClose, search]
  );

  const navigateBreadcrumb = useCallback((depth: number) => {
    // depth 0 = root ("Insert data"); depth N = keep first N stack entries.
    setDrillStack((stack) => stack.slice(0, depth));
    setSearch('');
  }, []);

  const navigateBack = useCallback(() => setDrillStack((stack) => stack.slice(0, -1)), []);
  const isDrilled = drillStack.length > 0 && !search;

  const popover = (
    <EuiPopover
      aria-label={i18n.translate('workflows.dataReferencePicker.popoverLabel', {
        defaultMessage: 'Data references',
      })}
      isOpen={isOpen && (!isTypeahead || flatNavigable.length > 0)}
      closePopover={onClose}
      button={
        <span
          aria-hidden
          data-test-subj="workflowDataReferencePickerCaretAnchor"
          css={{
            position: 'absolute',
            // A typeahead is placed by its popover box (below); this is the caret of an explicit
            // picker, measured once it is laid out.
            ...caretSpot(isTypeahead, caretAnchor),
            width: 1,
            pointerEvents: 'none',
          }}
        />
      }
      display="block"
      panelPaddingSize="none"
      anchorPosition="downLeft"
      hasArrow={false}
      ownFocus={false}
      repositionOnScroll
      data-test-subj={dataTestSubj}
      panelRef={(el) => {
        panelElRef.current = el;
      }}
      panelProps={{
        // The panel only exists while open, so this id says whether the dropdown is on screen.
        ...(isTypeahead ? { 'data-test-subj': 'workflowDataReferenceTypeahead' } : {}),
        css: {
          width: PICKER_WIDTH,
          maxWidth: PICKER_WIDTH,
          maxHeight: PICKER_MAX_HEIGHT,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          '&::after': {
            zIndex: 2,
          },
        },
      }}
    >
      <div
        role="presentation"
        onKeyDown={handleKeyDown}
        // A press must not take the focus from the editor being typed in: it would blur it.
        onMouseDown={isTypeahead ? (event) => event.preventDefault() : undefined}
        css={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          maxHeight: PICKER_MAX_HEIGHT,
          minHeight: 0,
        }}
      >
        {isTypeahead && drillStack.length === 0 ? null : (
          <PickerHeader
            drillStack={drillStack}
            isDrilled={isDrilled}
            onBack={navigateBack}
            onNavigate={navigateBreadcrumb}
          />
        )}

        {isTypeahead ? null : (
          <>
            <div css={{ padding: euiTheme.size.s, paddingBottom: euiTheme.size.s }}>
              <EuiFieldSearch
                inputRef={(el) => {
                  searchRef.current = el;
                }}
                compressed
                fullWidth
                placeholder={i18n.translate('workflows.dataReferencePicker.search', {
                  defaultMessage: 'Search',
                })}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                data-test-subj="workflowDataReferenceSearch"
              />
            </div>
          </>
        )}

        <ReferenceList
          visibleRows={visibleRows}
          expandedGroups={expandedGroups}
          isEmpty={flatNavigable.length === 0 && visibleRows.mode === 'search'}
          highlightIndex={highlightIndex}
          highlightedRowRef={highlightedRowRef}
          onHighlight={setHighlightIndex}
          onPick={insertItem}
          onToggleGroup={toggleGroupExpanded}
        />

        {isTypeahead ? null : <PickerFooter />}
      </div>
    </EuiPopover>
  );

  return (
    <div
      ref={wrapperRef}
      css={{
        position: 'relative',
        width: '100%',
        ...(fillHeight
          ? {
              flex: '1 1 auto',
              alignSelf: 'stretch',
              minHeight: 0,
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
            }
          : {}),
        // Keep the popover chrome out of flex layout; the panel portals to body.
        '& > .euiPopover': {
          position: 'absolute',
          width: 0,
          display: 'block !important',
          ...popoverBoxPosition(typeaheadAnchor, underControl),
        },
      }}
    >
      <div
        ref={(el) => {
          inputElRef.current = el;
        }}
        css={{
          width: '100%',
          ...(fillHeight
            ? {
                flex: '1 1 auto',
                height: '100%',
                minHeight: 0,
                display: 'flex',
                flexDirection: 'column',
              }
            : {}),
        }}
      >
        {input}
      </div>
      {popover}
    </div>
  );
}
