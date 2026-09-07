/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EuiBreadcrumb, EuiSelectableOption } from '@elastic/eui';
import {
  EuiBreadcrumbs,
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSelectable,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { componentStyles } from './actions_menu.styles';
import {
  getOptionActionId,
  KEYBOARD_ACTIVE_CLASS,
  renderActionOption,
} from './actions_menu_option';
import { ActionsMenuPreviewPanel } from './actions_menu_preview_panel';
import { useKibana } from '../../../hooks/use_kibana';
import { flattenOptions, getActionOptions } from '../lib/get_action_options';
import {
  getActionMatchRank,
  isActionSearchMatch,
  STEPS_PREFIX,
  useDisplayOptions,
} from '../lib/use_display_options';
import {
  type ActionOptionData,
  type EditorCommand,
  getMenuItemData,
  isActionConnectorGroup,
  isActionGroup,
  type JumpToStepEntry,
} from '../types';

export type { EditorCommand, JumpToStepEntry };

const SEARCH_INPUT_NAME = 'actions-menu-search';
const SELECTABLE_ID = 'actions-menu-selectable';

const REQUEST_ACTION_URL = 'https://github.com/elastic/workflows';

const LIST_SLIDE_MS = 220;

/** Post-navigation keyboard focus target for the left list. */
type PendingListFocus = 'first' | 'none' | { optionId: string };

function getActionableDisplayOptions<T extends EuiSelectableOption>(options: T[]): T[] {
  return options.filter((option) => !option.isGroupLabel && !option.disabled);
}

function isCategoryOption(option: EuiSelectableOption): boolean {
  const itemData = getMenuItemData(option);
  const action =
    itemData?.kind === 'action' ? itemData.action : (option as unknown as ActionOptionData);
  return isActionGroup(action) || isActionConnectorGroup(action);
}

function getNavDirection(fromPath: string[], toPath: string[]): 'forward' | 'back' {
  const isPrefix = fromPath.length <= toPath.length && fromPath.every((id, i) => id === toPath[i]);
  if (isPrefix) {
    return 'forward';
  }
  const isAncestor = toPath.length < fromPath.length && toPath.every((id, i) => id === fromPath[i]);
  if (isAncestor) {
    return 'back';
  }
  return toPath.length >= fromPath.length ? 'forward' : 'back';
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

export interface ActionsMenuProps {
  onActionSelected: (action: ActionOptionData) => void;
  commands?: EditorCommand[];
  jumpToStepEntries?: JumpToStepEntry[];
  onCommandSelected?: (commandId: string) => void;
  onJumpToStep?: (lineNumber: number) => void;
  onClose?: () => void;
}

function resolvePathLabels(
  path: string[],
  rootOptions: ActionOptionData[]
): Array<{ id: string; label: string }> {
  const labels: Array<{ id: string; label: string }> = [];
  let current = rootOptions;
  for (const id of path) {
    const found = current.find((o) => o.id === id);
    if (!found) break;
    labels.push({ id, label: found.label });
    if (isActionGroup(found) || isActionConnectorGroup(found)) {
      current = found.options;
    } else {
      break;
    }
  }
  return labels;
}

export function ActionsMenu({
  onActionSelected,
  commands,
  jumpToStepEntries,
  onCommandSelected,
  onJumpToStep,
  onClose,
}: ActionsMenuProps) {
  const styles = useMemoCss(componentStyles);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const { euiTheme } = useEuiTheme();
  const { workflowsExtensions } = useKibana().services;
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const menuContainerRef = useRef<HTMLDivElement | null>(null);
  const listViewportRef = useRef<HTMLDivElement | null>(null);
  const listPaneRef = useRef<HTMLDivElement | null>(null);
  const isSlidingRef = useRef(false);
  const pendingListFocusRef = useRef<PendingListFocus | null>(null);
  const keyboardIndexRef = useRef<number | null>(null);
  const defaultOptions = useMemo(
    () => getActionOptions(euiTheme, workflowsExtensions),
    [euiTheme, workflowsExtensions]
  );
  const flatOptions = useMemo(() => flattenOptions(defaultOptions), [defaultOptions]);

  const [options, setOptions] = useState<ActionOptionData[]>(defaultOptions);
  const [currentPath, setCurrentPath] = useState<Array<string>>([]);
  const [hoveredOption, setHoveredOption] = useState<ActionOptionData | null>(null);
  const [pinnedOption, setPinnedOption] = useState<ActionOptionData | null>(null);
  const [hoveredJumpEntry, setHoveredJumpEntry] = useState<JumpToStepEntry | null>(null);
  /** Index into actionable (non-label) display options; null = nothing keyboard-selected. */
  const [keyboardIndex, setKeyboardIndex] = useState<number | null>(null);
  keyboardIndexRef.current = keyboardIndex;

  const focusSearch = useCallback(() => {
    searchInputRef.current?.focus({ preventScroll: true });
  }, []);

  const clearKeyboardSelection = useCallback(() => {
    setKeyboardIndex(null);
    setHoveredOption(null);
    setHoveredJumpEntry(null);
  }, []);

  // Focus search when the menu first mounts; arrow keys then own list selection.
  useEffect(() => {
    focusSearch();
  }, [focusSearch]);

  /** Prevent clicks in the menu chrome from stealing focus away from search. */
  const keepSearchFocused = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest(`input[name="${SEARCH_INPUT_NAME}"]`)) {
      return;
    }
    e.preventDefault();
  }, []);

  useEffect(() => {
    if (currentPath.length === 0) {
      setOptions(defaultOptions);
    } else {
      let nextOptions = defaultOptions;
      for (const id of currentPath) {
        const next = nextOptions.find((o) => o.id === id);
        if (next && isActionGroup(next)) {
          nextOptions = next.options;
        } else {
          nextOptions = [];
        }
      }
      setOptions(nextOptions);
    }
  }, [defaultOptions, currentPath]);

  const displayOptions = useDisplayOptions({
    options,
    categoryTree: defaultOptions,
    searchTerm,
    commands,
    jumpToStepEntries,
    currentPath,
  });

  const actionableDisplayOptions = useMemo(
    () => getActionableDisplayOptions(displayOptions),
    [displayOptions]
  );
  const actionableDisplayOptionsRef = useRef(actionableDisplayOptions);
  actionableDisplayOptionsRef.current = actionableDisplayOptions;

  const currentPathRef = useRef(currentPath);
  currentPathRef.current = currentPath;

  const syncPreviewFromSelectableOption = useCallback((option: EuiSelectableOption) => {
    const itemData = getMenuItemData(option);
    if (itemData?.kind === 'jump') {
      setHoveredJumpEntry(itemData.entry);
      setHoveredOption(null);
      return;
    }
    if (itemData?.kind === 'command' || itemData?.kind === 'nav') {
      return;
    }
    const action =
      itemData?.kind === 'action' ? itemData.action : (option as unknown as ActionOptionData);
    setHoveredOption(action);
    setHoveredJumpEntry(null);
  }, []);

  const setKeyboardIndexAndPreview = useCallback(
    (index: number | null) => {
      setKeyboardIndex(index);
      if (index == null) {
        return;
      }
      const option = actionableDisplayOptionsRef.current[index];
      if (option) {
        syncPreviewFromSelectableOption(option);
      }
    },
    [syncPreviewFromSelectableOption]
  );

  // Apply pending keyboard focus after category enter/leave re-renders the list.
  useEffect(() => {
    const pending = pendingListFocusRef.current;
    if (pending == null || pending === 'none') {
      if (pending === 'none') {
        pendingListFocusRef.current = null;
      }
      return;
    }
    pendingListFocusRef.current = null;

    const actionable = getActionableDisplayOptions(displayOptions);
    if (pending === 'first') {
      if (actionable.length === 0) {
        setKeyboardIndex(null);
        return;
      }
      setKeyboardIndexAndPreview(0);
      return;
    }

    const idx = actionable.findIndex((option) => getOptionActionId(option) === pending.optionId);
    setKeyboardIndexAndPreview(idx >= 0 ? idx : null);
  }, [displayOptions, currentPath, setKeyboardIndexAndPreview]);

  // Keep the keyboard-active row visible while wrapping through long lists.
  useEffect(() => {
    if (keyboardIndex == null) return;
    const active = menuContainerRef.current?.querySelector(`.${KEYBOARD_ACTIVE_CLASS}`);
    const activeListItem = active?.closest('[role="option"]');
    activeListItem?.scrollIntoView({ block: 'nearest' });
  }, [keyboardIndex, currentPath]);

  const isSearching =
    searchTerm.trim().length > 0 &&
    !searchTerm.trimStart().startsWith('#') &&
    !searchTerm.startsWith(STEPS_PREFIX);

  const hasActionableItems = displayOptions.some((o) => !o.isGroupLabel);
  const showNoResults = isSearching && !hasActionableItems;

  const previewOption = hoveredOption ?? pinnedOption;

  const handleListMouseMove = useCallback(
    (e: React.MouseEvent<HTMLElement>) => {
      const el = e.target as HTMLElement;

      // Mouse hover takes over highlight + preview from keyboard selection.
      if (keyboardIndexRef.current != null) {
        setKeyboardIndex(null);
      }

      const jumpTarget = el.closest('[data-jump-id]');
      if (jumpTarget) {
        const jumpId = jumpTarget.getAttribute('data-jump-id');
        const entry = jumpToStepEntries?.find((j) => j.id === jumpId);
        if (entry && entry.id !== hoveredJumpEntry?.id) {
          setHoveredJumpEntry(entry);
          setHoveredOption(null);
        }
        return;
      }

      // Commands have no right-panel preview — keep the last preview as-is.
      if (el.closest('[data-command-id]')) {
        return;
      }

      const optionTarget = el.closest('[data-option-id]');
      if (!optionTarget) return;
      const optionId = optionTarget.getAttribute('data-option-id');
      if (!optionId) return;
      const found = flatOptions.find((o) => o.id === optionId);
      if (found && found.id !== hoveredOption?.id) {
        setHoveredOption(found);
        setHoveredJumpEntry(null);
      }
    },
    [flatOptions, hoveredOption, hoveredJumpEntry, jumpToStepEntries]
  );

  const navigateToPath = useCallback(
    (nextPath: string[], pendingFocus: PendingListFocus = 'none') => {
      pendingListFocusRef.current = pendingFocus;
      const applyNavigation = () => {
        let nextOptions: ActionOptionData[] = defaultOptions;
        for (const id of nextPath) {
          const nextOption = nextOptions.find((option) => option.id === id);
          if (nextOption && isActionGroup(nextOption)) {
            nextOptions = nextOption.options;
          } else {
            nextOptions = [];
          }
        }
        setCurrentPath(nextPath);
        setOptions(nextOptions);
        setPinnedOption(null);
        setHoveredOption(null);
        setHoveredJumpEntry(null);
        // Clear now; pending focus effect re-selects after the list re-renders.
        setKeyboardIndex(null);
      };

      const pathUnchanged =
        nextPath.length === currentPath.length && nextPath.every((id, i) => id === currentPath[i]);
      if (pathUnchanged) {
        applyNavigation();
        return;
      }

      const viewport = listViewportRef.current;
      const pane = listPaneRef.current;
      // Skip when reduced-motion is on, a slide is in flight, or layout isn't ready (e.g. jsdom)
      if (
        !viewport ||
        !pane ||
        prefersReducedMotion() ||
        isSlidingRef.current ||
        viewport.clientWidth === 0
      ) {
        applyNavigation();
        return;
      }

      const direction = getNavDirection(currentPath, nextPath);
      isSlidingRef.current = true;

      const outgoing = pane.cloneNode(true) as HTMLElement;
      outgoing.setAttribute('aria-hidden', 'true');
      outgoing.style.position = 'absolute';
      outgoing.style.inset = '0';
      outgoing.style.width = '100%';
      outgoing.style.height = '100%';
      outgoing.style.zIndex = '1';
      outgoing.style.pointerEvents = 'none';
      outgoing.style.backgroundColor = euiTheme.colors.backgroundBasePlain;
      viewport.appendChild(outgoing);

      // Park the incoming pane off-screen before React swaps the list content
      pane.style.transition = 'none';
      pane.style.transform = direction === 'forward' ? 'translateX(100%)' : 'translateX(-100%)';

      applyNavigation();

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const transition = `transform ${LIST_SLIDE_MS}ms cubic-bezier(0.25, 0.1, 0.25, 1)`;
          outgoing.style.transition = transition;
          pane.style.transition = transition;
          outgoing.style.transform =
            direction === 'forward' ? 'translateX(-100%)' : 'translateX(100%)';
          pane.style.transform = 'translateX(0)';

          let cleaned = false;
          const cleanup = () => {
            if (cleaned) return;
            cleaned = true;
            outgoing.remove();
            pane.style.transition = '';
            pane.style.transform = '';
            isSlidingRef.current = false;
          };
          outgoing.addEventListener('transitionend', cleanup, { once: true });
          window.setTimeout(cleanup, LIST_SLIDE_MS + 80);
        });
      });
    },
    [currentPath, defaultOptions, euiTheme.colors.backgroundBasePlain]
  );

  const handleStepOrGroupSelected = useCallback(
    (action: ActionOptionData) => {
      if (isActionGroup(action)) {
        const nextPath = action.pathIds ?? [...currentPath, action.id];
        setSearchTerm('');
        // Mouse/click browse: no keyboard selection at the new level.
        navigateToPath([...nextPath], 'none');
      } else {
        setPinnedOption(null);
        onActionSelected(action);
      }
    },
    [currentPath, navigateToPath, onActionSelected]
  );

  const handleAddStep = useCallback(
    (action: ActionOptionData) => {
      setPinnedOption(null);
      onActionSelected(action);
    },
    [onActionSelected]
  );

  const handlePinPreview = useCallback((action: ActionOptionData, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setPinnedOption(action);
    setHoveredOption(action);
    setHoveredJumpEntry(null);
  }, []);

  const handleAddFromRow = useCallback(
    (action: ActionOptionData, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      handleAddStep(action);
    },
    [handleAddStep]
  );

  const handleChange = (
    _updatedOptions: EuiSelectableOption[],
    _event: React.BaseSyntheticEvent,
    selectedOption: EuiSelectableOption
  ) => {
    const itemData = getMenuItemData(selectedOption);

    if (itemData?.kind === 'nav') {
      if (itemData.target === 'viewAll') {
        const currentQuery = searchTerm.trim();
        setSearchTerm(`${STEPS_PREFIX}${currentQuery}`);
      } else {
        setSearchTerm('#');
      }
      return;
    }
    if (itemData?.kind === 'command') {
      onCommandSelected?.(itemData.command.id);
      return;
    }
    if (itemData?.kind === 'jump') {
      onJumpToStep?.(itemData.entry.lineStart);
      return;
    }

    const action =
      itemData?.kind === 'action'
        ? itemData.action
        : (selectedOption as unknown as ActionOptionData);
    handleStepOrGroupSelected(action);
  };

  const handleChangeRef = useRef(handleChange);
  handleChangeRef.current = handleChange;

  const enterCategoryFromKeyboard = useCallback(() => {
    const index = keyboardIndexRef.current;
    if (index == null) return;
    const option = actionableDisplayOptionsRef.current[index];
    if (!option || !isCategoryOption(option)) return;
    const itemData = getMenuItemData(option);
    const action =
      itemData?.kind === 'action' ? itemData.action : (option as unknown as ActionOptionData);
    if (!isActionGroup(action)) return;
    const nextPath = action.pathIds ?? [...currentPathRef.current, action.id];
    setSearchTerm('');
    navigateToPath([...nextPath], 'first');
  }, [navigateToPath]);

  const leaveCategoryFromKeyboard = useCallback(() => {
    const path = currentPathRef.current;
    if (path.length === 0) return;
    const exitedId = path[path.length - 1];
    navigateToPath(path.slice(0, -1), { optionId: exitedId });
  }, [navigateToPath]);

  const activateKeyboardOption = useCallback(() => {
    const index = keyboardIndexRef.current;
    if (index == null) return;
    const option = actionableDisplayOptionsRef.current[index];
    if (!option) return;
    // Enter on a category drills in and selects the first child (keyboard path).
    if (isCategoryOption(option)) {
      enterCategoryFromKeyboard();
      return;
    }
    handleChangeRef.current([], {} as React.BaseSyntheticEvent, option);
  }, [enterCategoryFromKeyboard]);

  const optionMatcher = () => true;

  const handleSearchChange = (searchValue: string) => {
    setSearchTerm(searchValue);
    setPinnedOption(null);
    setHoveredOption(null);
    setHoveredJumpEntry(null);
    setKeyboardIndex(null);

    if (searchValue.length > 0) {
      setCurrentPath([]);
    }

    // Steps: prefix keeps a flat, ranked list in `options` for the unlimited results view.
    if (searchValue.startsWith(STEPS_PREFIX)) {
      const query = searchValue.slice(STEPS_PREFIX.length).trim().toLowerCase();
      if (query.length === 0) {
        setOptions(flatOptions);
      } else {
        const matches = flatOptions
          .filter((option) => isActionSearchMatch(option, query))
          .sort((a, b) => {
            const rankDiff = getActionMatchRank(a, query) - getActionMatchRank(b, query);
            return rankDiff !== 0 ? rankDiff : a.label.localeCompare(b.label);
          });
        setOptions(matches);
      }
      return;
    }

    if (searchValue.trimStart().startsWith('#')) {
      return;
    }

    // Normal search mode builds sectioned results from categoryTree in useDisplayOptions.
    // Reset browse-level options to the root tree when clearing search.
    if (searchValue.length === 0) {
      setOptions(defaultOptions);
    }
  };

  const handleSearchChangeRef = useRef(handleSearchChange);
  handleSearchChangeRef.current = handleSearchChange;

  const setKeyboardIndexAndPreviewRef = useRef(setKeyboardIndexAndPreview);
  setKeyboardIndexAndPreviewRef.current = setKeyboardIndexAndPreview;

  // List keyboard navigation + typing returns focus to search.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const input = searchInputRef.current;
      if (!input || !document.body.contains(input)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const menuEl = menuContainerRef.current;
      if (menuEl && !menuEl.contains(document.activeElement) && document.activeElement !== input) {
        // Ignore keys when focus is completely outside the menu.
        if (!menuEl.contains(e.target as Node)) return;
      }
      const eventTarget = e.target as HTMLElement;
      if (eventTarget !== input && eventTarget.closest('button, a, [role="tab"]')) {
        return;
      }

      const actionable = actionableDisplayOptionsRef.current;
      const isSearchFocused = document.activeElement === input;
      const keyboardIdx = keyboardIndexRef.current;
      const inListNavMode = keyboardIdx != null;

      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        if (actionable.length === 0) return;
        e.preventDefault();
        e.stopPropagation();

        if (!inListNavMode) {
          setKeyboardIndexAndPreviewRef.current(e.key === 'ArrowDown' ? 0 : actionable.length - 1);
          return;
        }

        const delta = e.key === 'ArrowDown' ? 1 : -1;
        const next = (keyboardIdx + delta + actionable.length) % actionable.length;
        setKeyboardIndexAndPreviewRef.current(next);
        return;
      }

      if (e.key === 'ArrowRight') {
        if (!inListNavMode) return; // caret movement in search
        e.preventDefault();
        e.stopPropagation();
        enterCategoryFromKeyboard();
        return;
      }

      if (e.key === 'ArrowLeft') {
        if (!inListNavMode) return; // caret movement in search
        e.preventDefault();
        e.stopPropagation();
        leaveCategoryFromKeyboard();
        return;
      }

      if (e.key === 'Enter' && inListNavMode) {
        e.preventDefault();
        e.stopPropagation();
        activateKeyboardOption();
        return;
      }

      // Typing while list-focused returns to search and clears selection.
      if (isSearchFocused && !inListNavMode) return;

      const isPrintable = e.key.length === 1;
      if (!isPrintable && e.key !== 'Backspace' && e.key !== 'Delete') return;

      e.preventDefault();
      e.stopPropagation();
      clearKeyboardSelection();
      focusSearch();

      if (isPrintable) {
        handleSearchChangeRef.current(`${input.value}${e.key}`);
      } else if (e.key === 'Backspace') {
        handleSearchChangeRef.current(input.value.slice(0, -1));
      } else if (e.key === 'Delete') {
        handleSearchChangeRef.current('');
      }
    };

    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, [
    activateKeyboardOption,
    clearKeyboardSelection,
    enterCategoryFromKeyboard,
    focusSearch,
    leaveCategoryFromKeyboard,
  ]);

  const pathLabels = useMemo(
    () => resolvePathLabels(currentPath, defaultOptions),
    [currentPath, defaultOptions]
  );

  const breadcrumbs: EuiBreadcrumb[] = useMemo(() => {
    const allActionsLabel = i18n.translate('workflows.actionsMenu.breadcrumb.allActions', {
      defaultMessage: 'All actions',
    });

    if (isSearching || searchTerm.startsWith(STEPS_PREFIX)) {
      return [
        {
          text: allActionsLabel,
          onClick: (e: React.MouseEvent) => {
            e.preventDefault();
            setSearchTerm('');
            navigateToPath([]);
          },
        },
        {
          text: i18n.translate('workflows.actionsMenu.breadcrumb.searchResults', {
            defaultMessage: 'Search results',
          }),
        },
      ];
    }

    if (currentPath.length === 0) return [];

    const crumbs: EuiBreadcrumb[] = [
      {
        text: allActionsLabel,
        onClick: (e: React.MouseEvent) => {
          e.preventDefault();
          navigateToPath([]);
        },
      },
    ];

    pathLabels.forEach((item, index) => {
      const isLast = index === pathLabels.length - 1;
      const pathToHere = currentPath.slice(0, index + 1);
      crumbs.push({
        text: item.label,
        ...(isLast
          ? {}
          : {
              onClick: (e: React.MouseEvent) => {
                e.preventDefault();
                navigateToPath(pathToHere);
              },
            }),
      });
    });

    return crumbs;
  }, [isSearching, searchTerm, currentPath, pathLabels, navigateToPath]);

  const showBreadcrumbs = breadcrumbs.length > 0;
  const activeOption = keyboardIndex == null ? undefined : actionableDisplayOptions[keyboardIndex];
  const activeOptionIndex = activeOption ? displayOptions.indexOf(activeOption) : undefined;
  const activeOptionId =
    activeOptionIndex === undefined
      ? undefined
      : `${SELECTABLE_ID}_listbox_option-${activeOptionIndex}`;

  return (
    <EuiSelectable
      id={SELECTABLE_ID}
      aria-label={i18n.translate('workflows.actionsMenu.ariaLabel', {
        defaultMessage: 'Actions menu',
      })}
      searchable
      options={displayOptions}
      onChange={handleChange}
      optionMatcher={optionMatcher}
      searchProps={{
        id: 'actions-menu-search',
        name: SEARCH_INPUT_NAME,
        placeholder: i18n.translate('workflows.actionsMenu.searchPlaceholder', {
          defaultMessage: 'Search step, command or # to go to a step',
        }),
        value: searchTerm,
        onChange: handleSearchChange,
        compressed: true,
        isClearable: true,
        inputRef: (node: HTMLInputElement | null) => {
          searchInputRef.current = node;
        },
        'aria-activedescendant': activeOptionId,
        onBlur: (e: React.FocusEvent<HTMLInputElement>) => {
          const next = e.relatedTarget as Node | null;
          const menuEl = menuContainerRef.current;
          // Keep list keyboard nav possible; only pull focus back if it left the menu.
          if (menuEl && next && menuEl.contains(next)) {
            return;
          }
          requestAnimationFrame(() => {
            if (searchInputRef.current && document.body.contains(searchInputRef.current)) {
              const active = document.activeElement;
              if (menuContainerRef.current?.contains(active)) {
                return;
              }
              focusSearch();
            }
          });
        },
      }}
      listProps={{
        showIcons: false,
        activeOptionIndex,
        paddingSize: 'none',
        onFocusBadge: false,
        isVirtualized: searchTerm.startsWith(STEPS_PREFIX),
        ...(searchTerm.startsWith(STEPS_PREFIX) && { rowHeight: 64 }),
      }}
      renderOption={(rawOption, searchValue) =>
        renderActionOption({
          rawOption,
          searchValue,
          searchTerm,
          keyboardIndex,
          actionableDisplayOptions,
          styles,
          euiTheme,
          handlePinPreview,
          handleAddFromRow,
        })
      }
      css={styles.selectable}
      singleSelection
    >
      {(list, search) => (
        <div ref={menuContainerRef} css={styles.container} onMouseDown={keepSearchFocused}>
          {/* Full-width header: title + search */}
          <div css={styles.header}>
            <div css={styles.titleRow}>
              <EuiTitle size="xxs">
                <h3 css={styles.title}>
                  <FormattedMessage
                    id="workflows.actionsMenu.title"
                    defaultMessage="Actions menu"
                  />
                </h3>
              </EuiTitle>
              {onClose && (
                <EuiButtonEmpty
                  onClick={onClose}
                  iconType="cross"
                  size="xs"
                  flush="right"
                  color="text"
                  aria-label={i18n.translate('workflows.actionsMenu.close', {
                    defaultMessage: 'Close actions menu',
                  })}
                  css={styles.closeButton}
                />
              )}
            </div>
            <div css={styles.searchRow}>{search}</div>
          </div>

          <EuiFlexGroup gutterSize="none" css={styles.body}>
            {/* Left column — list */}
            <EuiFlexItem css={styles.leftColumn} onMouseMove={handleListMouseMove}>
              {showBreadcrumbs && (
                <div css={styles.breadcrumbRow}>
                  <EuiBreadcrumbs
                    breadcrumbs={breadcrumbs}
                    truncate={false}
                    max={4}
                    aria-label={i18n.translate('workflows.actionsMenu.breadcrumb.ariaLabel', {
                      defaultMessage: 'Actions menu navigation',
                    })}
                  />
                </div>
              )}
              {showNoResults ? (
                <div css={styles.noResults}>
                  <EuiText size="s" color="subdued" textAlign="center">
                    <FormattedMessage
                      id="workflows.actionsMenu.noResults"
                      defaultMessage="{query} doesn't match any options."
                      values={{ query: searchTerm.trim() }}
                    />
                  </EuiText>
                  <EuiButton
                    size="s"
                    href={REQUEST_ACTION_URL}
                    target="_blank"
                    iconType="popout"
                    iconSide="right"
                    color="primary"
                  >
                    <FormattedMessage
                      id="workflows.actionsMenu.requestAction"
                      defaultMessage="Request an action"
                    />
                  </EuiButton>
                </div>
              ) : (
                <div ref={listViewportRef} css={styles.listViewport}>
                  <div ref={listPaneRef} css={styles.listPane}>
                    {list}
                  </div>
                </div>
              )}
            </EuiFlexItem>

            {/* Right column — preview */}
            <EuiFlexItem css={styles.rightColumn}>
              <ActionsMenuPreviewPanel
                hoveredOption={previewOption}
                hoveredJumpEntry={hoveredJumpEntry}
                onStepSelected={handleStepOrGroupSelected}
                onAddStep={handleAddStep}
                onPinPreview={(action, parentSection) => {
                  // From a category preview: open that category on the left so the
                  // list matches the right panel, then pin this step's detail.
                  if (
                    parentSection &&
                    (isActionGroup(parentSection) || isActionConnectorGroup(parentSection))
                  ) {
                    const nextPath = parentSection.pathIds ?? [...currentPath, parentSection.id];
                    const alreadyThere =
                      nextPath.length === currentPath.length &&
                      nextPath.every((id, i) => id === currentPath[i]);
                    if (!alreadyThere) {
                      setSearchTerm('');
                      navigateToPath([...nextPath]);
                    }
                  }
                  setPinnedOption(action);
                  setHoveredOption(action);
                  setHoveredJumpEntry(null);
                }}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </div>
      )}
    </EuiSelectable>
  );
}
