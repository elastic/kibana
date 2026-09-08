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
import { getOptionActionId, renderActionOption } from './actions_menu_option';
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
const SEARCH_VIRTUALIZATION_THRESHOLD = 30;

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

function getOptionsAtPath(rootOptions: ActionOptionData[], path: string[]): ActionOptionData[] {
  let options = rootOptions;
  for (const id of path) {
    const option = options.find((item) => item.id === id);
    if (!option || !isActionGroup(option)) {
      return [];
    }
    options = option.options;
  }
  return options;
}

export interface ActionsMenuProps {
  onActionSelected: (action: ActionOptionData) => void;
  commands?: EditorCommand[];
  jumpToStepEntries?: JumpToStepEntry[];
  onCommandSelected?: (commandId: string) => void;
  onJumpToStep?: (lineNumber: number) => void;
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
}: ActionsMenuProps) {
  const styles = useMemoCss(componentStyles);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const { euiTheme } = useEuiTheme();
  const { workflowsExtensions } = useKibana().services;
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const menuContainerRef = useRef<HTMLDivElement | null>(null);
  const pendingListFocusRef = useRef<PendingListFocus | null>(null);
  const keyboardIndexRef = useRef<number | null>(null);
  const defaultOptions = useMemo(
    () => getActionOptions(euiTheme, workflowsExtensions),
    [euiTheme, workflowsExtensions]
  );
  const flatOptions = useMemo(() => flattenOptions(defaultOptions), [defaultOptions]);

  const [currentPath, setCurrentPath] = useState<Array<string>>([]);
  const [hoveredOption, setHoveredOption] = useState<ActionOptionData | null>(null);
  const [pinnedOption, setPinnedOption] = useState<ActionOptionData | null>(null);
  const [hoveredJumpEntry, setHoveredJumpEntry] = useState<JumpToStepEntry | null>(null);
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

  useEffect(() => {
    focusSearch();
  }, [focusSearch]);

  const keepSearchFocused = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest(`input[name="${SEARCH_INPUT_NAME}"]`)) {
      return;
    }
    e.preventDefault();
  }, []);

  const options = useMemo(() => {
    if (!searchTerm.startsWith(STEPS_PREFIX)) {
      return getOptionsAtPath(defaultOptions, currentPath);
    }
    const query = searchTerm.slice(STEPS_PREFIX.length).trim().toLowerCase();
    if (!query) {
      return flatOptions;
    }
    return flatOptions
      .filter((option) => isActionSearchMatch(option, query))
      .sort((a, b) => {
        const rankDiff = getActionMatchRank(a, query) - getActionMatchRank(b, query);
        return rankDiff !== 0 ? rankDiff : a.label.localeCompare(b.label);
      });
  }, [currentPath, defaultOptions, flatOptions, searchTerm]);

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
      const actionableOptions = actionableDisplayOptionsRef.current;

      const jumpTarget = el.closest('[data-jump-id]');
      if (jumpTarget) {
        const jumpId = jumpTarget.getAttribute('data-jump-id');
        const index = actionableOptions.findIndex((option) => {
          const itemData = getMenuItemData(option);
          return itemData?.kind === 'jump' && itemData.entry.id === jumpId;
        });
        setKeyboardIndex(index >= 0 ? index : null);
        const entry = jumpToStepEntries?.find((j) => j.id === jumpId);
        if (entry && entry.id !== hoveredJumpEntry?.id) {
          setHoveredJumpEntry(entry);
          setHoveredOption(null);
        }
        return;
      }

      const commandTarget = el.closest('[data-command-id]');
      if (commandTarget) {
        const commandId = commandTarget.getAttribute('data-command-id');
        const index = actionableOptions.findIndex((option) => {
          const itemData = getMenuItemData(option);
          return itemData?.kind === 'command' && itemData.command.id === commandId;
        });
        setKeyboardIndex(index >= 0 ? index : null);
        return;
      }

      const optionTarget = el.closest('[data-option-id]');
      if (!optionTarget) return;
      const optionId = optionTarget.getAttribute('data-option-id');
      if (!optionId) return;
      const index = actionableOptions.findIndex((option) => getOptionActionId(option) === optionId);
      setKeyboardIndex(index >= 0 ? index : null);
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
      setCurrentPath(nextPath);
      setPinnedOption(null);
      setHoveredOption(null);
      setHoveredJumpEntry(null);
      setKeyboardIndex(null);
    },
    []
  );

  const handleStepOrGroupSelected = useCallback(
    (action: ActionOptionData) => {
      if (isActionGroup(action)) {
        const nextPath = action.pathIds ?? [...currentPath, action.id];
        setSearchTerm('');
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
  };

  const handleSearchChangeRef = useRef(handleSearchChange);
  handleSearchChangeRef.current = handleSearchChange;

  const setKeyboardIndexAndPreviewRef = useRef(setKeyboardIndexAndPreview);
  setKeyboardIndexAndPreviewRef.current = setKeyboardIndexAndPreview;

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const input = searchInputRef.current;
      if (!input || !document.body.contains(input)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const menuEl = menuContainerRef.current;
      if (menuEl && !menuEl.contains(document.activeElement) && document.activeElement !== input) {
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
        if (!inListNavMode) return;
        e.preventDefault();
        e.stopPropagation();
        enterCategoryFromKeyboard();
        return;
      }

      if (e.key === 'ArrowLeft') {
        if (!inListNavMode) return;
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

      const isPrintable = e.key.length === 1;
      if (isSearchFocused) {
        if (inListNavMode && (isPrintable || e.key === 'Backspace' || e.key === 'Delete')) {
          clearKeyboardSelection();
        }
        return;
      }

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
  useEffect(() => {
    if (!activeOptionId) return;
    document.getElementById(activeOptionId)?.scrollIntoView({ block: 'nearest' });
  }, [activeOptionId]);
  const isSearchVirtualized =
    searchTerm.length > 0 && displayOptions.length > SEARCH_VIRTUALIZATION_THRESHOLD;

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
        fullWidth: true,
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
        isVirtualized: isSearchVirtualized,
        ...(isSearchVirtualized && { rowHeight: 64 }),
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
        })
      }
      css={styles.selectable}
      singleSelection
      height="full"
    >
      {(list, search) => (
        <div ref={menuContainerRef} css={styles.container}>
          <div css={styles.header}>
            <EuiTitle size="xxs">
              <h3 css={styles.title}>
                <FormattedMessage id="workflows.actionsMenu.title" defaultMessage="Actions menu" />
              </h3>
            </EuiTitle>
            <div>{search}</div>
          </div>

          <EuiFlexGroup gutterSize="none" css={styles.body}>
            <EuiFlexItem
              css={styles.leftColumn}
              onMouseDown={keepSearchFocused}
              onMouseMove={handleListMouseMove}
            >
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
                </div>
              ) : (
                <div css={styles.listViewport}>
                  <div css={styles.listPane}>{list}</div>
                </div>
              )}
            </EuiFlexItem>

            <EuiFlexItem css={styles.rightColumn} data-test-subj="actionsMenuPreview">
              <ActionsMenuPreviewPanel
                hoveredOption={previewOption}
                hoveredJumpEntry={hoveredJumpEntry}
                onStepSelected={handleStepOrGroupSelected}
                onAddStep={handleAddStep}
                onPinPreview={(action, parentSection) => {
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
