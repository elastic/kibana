/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EuiBreadcrumb, EuiSelectableOption, UseEuiTheme } from '@elastic/eui';
import {
  EuiBetaBadge,
  EuiBreadcrumbs,
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  euiFontSize,
  EuiHighlight,
  EuiIcon,
  EuiSelectable,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { getBaseConnectorType } from '@kbn/workflows-ui';
import { ActionsMenuPreviewPanel } from './actions_menu_preview_panel';
import { useKibana } from '../../../hooks/use_kibana';
import { StepIcon } from '../../../shared/ui/step_icons/step_icon';
import { flattenOptions, getActionOptions, usesInverseIconColor } from '../lib/get_action_options';
import { STEPS_PREFIX, useDisplayOptions } from '../lib/use_display_options';
import {
  type ActionOptionData,
  type EditorCommand,
  getMenuItemData,
  type IconVariant,
  isActionConnectorGroup,
  isActionConnectorOption,
  isActionGroup,
  isActionOption,
  type JumpToStepEntry,
} from '../types';

export type { EditorCommand, JumpToStepEntry };

const SEARCH_INPUT_NAME = 'actions-menu-search';

const REQUEST_ACTION_URL = 'https://github.com/elastic/workflows';

const LIST_SLIDE_MS = 220;

function getNavDirection(fromPath: string[], toPath: string[]): 'forward' | 'back' {
  const isPrefix =
    fromPath.length <= toPath.length && fromPath.every((id, i) => id === toPath[i]);
  if (isPrefix) {
    return 'forward';
  }
  const isAncestor =
    toPath.length < fromPath.length && toPath.every((id, i) => id === fromPath[i]);
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

function getIconOuterStyle(
  variant: IconVariant | undefined,
  styles: ReturnType<typeof useMemoCss<typeof componentStyles>>
) {
  switch (variant) {
    case 'trigger':
      return styles.iconOuterTrigger;
    case 'external':
    case 'neutral':
      return styles.iconOuterAppLogo;
    case 'flowControl':
      return styles.iconOuterFlowControl;
    case 'dataTransformation':
      return styles.iconOuterDataTransformation;
    case 'platform':
    default:
      return styles.iconOuterPlatform;
  }
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
  const listViewportRef = useRef<HTMLDivElement | null>(null);
  const listPaneRef = useRef<HTMLDivElement | null>(null);
  const isSlidingRef = useRef(false);
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

  const focusSearch = useCallback(() => {
    searchInputRef.current?.focus({ preventScroll: true });
  }, []);

  // Spotlight-style: keep the search field focused whenever the menu is open,
  // including after browsing into categories.
  useEffect(() => {
    focusSearch();
  }, [focusSearch, currentPath]);

  /** Prevent clicks in the menu from stealing focus away from search. */
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
    (nextPath: string[]) => {
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
      };

      const pathUnchanged =
        nextPath.length === currentPath.length &&
        nextPath.every((id, i) => id === currentPath[i]);
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
      pane.style.transform =
        direction === 'forward' ? 'translateX(100%)' : 'translateX(-100%)';

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
        navigateToPath([...nextPath]);
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

  const renderActionOption = (rawOption: EuiSelectableOption, searchValue: string) => {
    const itemData = getMenuItemData(rawOption);
    // Prefer controlled searchTerm so highlights stay correct in search mode
    // even if EuiSelectable's renderOption search arg is stale/empty.
    const rawSearch = (searchTerm || searchValue).trim();
    const effectiveSearch = rawSearch.startsWith(STEPS_PREFIX)
      ? rawSearch.slice(STEPS_PREFIX.length).trim()
      : rawSearch.startsWith('#')
      ? rawSearch.slice(1).trim()
      : rawSearch;

    if (itemData?.kind === 'command') {
      const { command } = itemData;
      return (
        <div css={styles.actionOptionWrapper} data-command-id={command.id}>
          <EuiFlexGroup
            alignItems="center"
            css={styles.actionOption}
            gutterSize="none"
            responsive={false}
          >
            <EuiFlexItem grow={false} css={[styles.iconOuter, styles.iconOuterCommand]}>
              <span css={styles.actionIconInner}>
                <EuiIcon
                  type={command.iconType}
                  size="m"
                  color={euiTheme.colors.textParagraph}
                  aria-hidden={true}
                />
              </span>
            </EuiFlexItem>
            <EuiFlexItem css={styles.actionInfo}>
              <EuiFlexGroup direction="column" gutterSize="none">
                <EuiFlexItem>
                  <EuiTitle size="xxxs" css={styles.actionTitle}>
                    <h6>
                      <EuiHighlight search={effectiveSearch} highlightAll>
                        {rawOption.label}
                      </EuiHighlight>
                    </h6>
                  </EuiTitle>
                </EuiFlexItem>
                {command.description && (
                  <EuiFlexItem>
                    <EuiText size="xs" className="eui-displayBlock" css={styles.actionDescription}>
                      <EuiHighlight search={effectiveSearch} highlightAll>
                        {command.description}
                      </EuiHighlight>
                    </EuiText>
                  </EuiFlexItem>
                )}
              </EuiFlexGroup>
            </EuiFlexItem>
            {command.shortcut && command.shortcut.length > 0 && (
              <EuiFlexItem grow={false} css={styles.shortcutContainer}>
                {command.shortcut.map((key) => (
                  <kbd key={key} css={styles.shortcutKey}>
                    {key}
                  </kbd>
                ))}
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </div>
      );
    }

    if (itemData?.kind === 'jump') {
      return (
        <div css={styles.compactOptionWrapper} data-jump-id={itemData.entry.id}>
          <EuiText size="s">
            <EuiHighlight search={effectiveSearch} highlightAll>
              {rawOption.label}
            </EuiHighlight>
          </EuiText>
        </div>
      );
    }

    if (itemData?.kind === 'nav') {
      return (
        <div css={styles.compactOptionWrapper}>
          <EuiFlexGroup
            alignItems="center"
            justifyContent="spaceBetween"
            gutterSize="xs"
            css={styles.viewAllLink}
          >
            <EuiFlexItem grow={false}>
              <EuiText size="xs" color="primary">
                {rawOption.label}
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiIcon type="arrowRight" size="s" color="primary" aria-hidden={true} />
            </EuiFlexItem>
          </EuiFlexGroup>
        </div>
      );
    }

    const action =
      itemData?.kind === 'action' ? itemData.action : (rawOption as unknown as ActionOptionData);
    const shouldUseGroupStyle = isActionGroup(action) || isActionConnectorGroup(action);
    const glyphColor = usesInverseIconColor(action.iconVariant)
      ? euiTheme.colors.textInverse
      : 'iconColor' in action
      ? action.iconColor
      : undefined;

    return (
      <div
        css={styles.actionOptionWrapper}
        className="actionOptionWrapper"
        data-option-id={action.id}
      >
        <EuiFlexGroup alignItems="center" css={styles.actionOption} gutterSize="none">
          <EuiFlexItem
            grow={false}
            css={[styles.iconOuter, getIconOuterStyle(action.iconVariant, styles)]}
          >
            <span css={shouldUseGroupStyle ? styles.groupIconInner : styles.actionIconInner}>
              {isActionConnectorGroup(action) || isActionConnectorOption(action) ? (
                // Prefer an explicit menu icon (e.g. sparkles for AI) over the connector glyph
                'iconType' in action && action.iconType === 'sparkles' ? (
                  <EuiIcon type="sparkles" size="m" color={glyphColor} aria-hidden={true} />
                ) : (
                  <StepIcon
                    stepType={getBaseConnectorType(action.connectorType)}
                    executionStatus={undefined}
                  />
                )
              ) : isActionGroup(action) || isActionOption(action) ? (
                <EuiIcon type={action.iconType} size="m" color={glyphColor} aria-hidden={true} />
              ) : null}
            </span>
          </EuiFlexItem>
          <EuiFlexGroup direction="column" gutterSize="none" css={styles.actionInfo}>
            <EuiFlexItem>
              <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" gutterSize="none">
                <EuiFlexGroup alignItems="center" gutterSize="s">
                  <EuiTitle size="xxxs" css={styles.actionTitle}>
                    <h6>
                      <EuiHighlight search={effectiveSearch} highlightAll>
                        {action.label}
                      </EuiHighlight>
                    </h6>
                  </EuiTitle>
                  {action.stability === 'tech_preview' && (
                    <EuiBetaBadge
                      iconType="flask"
                      label={i18n.translate('workflows.actionsMenu.techPreviewBadge', {
                        defaultMessage: 'Tech preview',
                      })}
                      size="s"
                      css={styles.techPreviewBadge}
                    />
                  )}
                  {action.stability === 'beta' && (
                    <EuiBetaBadge
                      label={i18n.translate('workflows.actionsMenu.betaBadge', {
                        defaultMessage: 'Beta',
                      })}
                      size="s"
                      css={styles.techPreviewBadge}
                    />
                  )}
                </EuiFlexGroup>
                <EuiText color="subdued" size="xs">
                  {action.instancesLabel}
                </EuiText>
              </EuiFlexGroup>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiText size="xs" className="eui-displayBlock" css={styles.actionDescription}>
                <EuiHighlight search={effectiveSearch} highlightAll>
                  {action.description || ''}
                </EuiHighlight>
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
          {shouldUseGroupStyle ? (
            <EuiFlexItem grow={false} css={styles.arrowContainer}>
              <EuiIcon type="arrowRight" size="s" css={styles.arrow} aria-hidden={true} />
            </EuiFlexItem>
          ) : (
            <span className="rowActions" css={styles.rowActions}>
              <EuiButtonIcon
                iconType="info"
                size="m"
                iconSize="m"
                color="text"
                display="empty"
                css={styles.rowActionButton}
                aria-label={i18n.translate('workflows.actionsMenu.viewDetails', {
                  defaultMessage: 'View details',
                })}
                data-test-subj="actionsMenuItemInfo"
                onClick={(e: React.MouseEvent) => handlePinPreview(action, e)}
                onMouseDown={(e: React.MouseEvent) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
              />
              <EuiButtonIcon
                iconType="plusInCircle"
                size="m"
                iconSize="m"
                color="text"
                display="empty"
                css={styles.rowActionButton}
                aria-label={i18n.translate('workflows.actionsMenu.addStep', {
                  defaultMessage: 'Add step',
                })}
                data-test-subj="actionsMenuItemAdd"
                onClick={(e: React.MouseEvent) => handleAddFromRow(action, e)}
                onMouseDown={(e: React.MouseEvent) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
              />
            </span>
          )}
        </EuiFlexGroup>
      </div>
    );
  };

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

  /** Lower rank = higher priority in search results (Steps: mode only). */
  const MAX_ACTION_MATCH_RANK = 5;

  const getActionMatchRank = (option: ActionOptionData, normalizedTerm: string): number => {
    if (!normalizedTerm) return 0;
    const id = option.id.toLowerCase();
    const label = option.label.toLowerCase();
    const description = option.description?.toLowerCase() ?? '';

    if (id === normalizedTerm) return 0;
    if (label === normalizedTerm) return 1;
    if (description === normalizedTerm) return 2;
    if (id.includes(normalizedTerm)) return 3;
    if (label.includes(normalizedTerm)) return 4;
    if (description.includes(normalizedTerm)) return 5;
    return MAX_ACTION_MATCH_RANK + 1;
  };

  const isActionSearchMatch = (option: ActionOptionData, normalizedTerm: string) =>
    getActionMatchRank(option, normalizedTerm) <= MAX_ACTION_MATCH_RANK;

  const optionMatcher = () => true;

  const handleSearchChange = (searchValue: string) => {
    setSearchTerm(searchValue);
    setPinnedOption(null);
    setHoveredOption(null);
    setHoveredJumpEntry(null);

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

  // If focus leaves the search field (e.g. arrow-key option focus), typing still searches.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const input = searchInputRef.current;
      if (!input || !document.body.contains(input)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (document.activeElement === input) return;

      const isPrintable = e.key.length === 1;
      if (!isPrintable && e.key !== 'Backspace' && e.key !== 'Delete') return;

      e.preventDefault();
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
  }, [focusSearch]);

  const displayOptionsNoTooltip = useMemo(
    () => displayOptions.map((o) => ({ ...o, toolTipContent: '' })),
    [displayOptions]
  );

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

  return (
    <EuiSelectable
      aria-label={i18n.translate('workflows.actionsMenu.ariaLabel', {
        defaultMessage: 'Actions menu',
      })}
      searchable
      options={displayOptionsNoTooltip}
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
        onBlur: () => {
          // Restore focus unless the menu is unmounting
          requestAnimationFrame(() => {
            if (searchInputRef.current && document.body.contains(searchInputRef.current)) {
              focusSearch();
            }
          });
        },
      }}
      listProps={{
        showIcons: false,
        paddingSize: 'none',
        onFocusBadge: false,
        isVirtualized: searchTerm.startsWith(STEPS_PREFIX),
        ...(searchTerm.startsWith(STEPS_PREFIX) && { rowHeight: 64 }),
      }}
      renderOption={renderActionOption}
      css={styles.selectable}
      singleSelection
    >
      {(list, search) => (
        <div css={styles.container} onMouseDown={keepSearchFocused}>
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

const componentStyles = {
  container: css({
    display: 'flex',
    flexDirection: 'column',
    width: '1085px',
  }),
  header: ({ euiTheme }: UseEuiTheme) =>
    css({
      flexShrink: 0,
      padding: `16px ${euiTheme.size.base} 12px`,
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      borderBottom: `1px solid ${euiTheme.colors.borderBaseSubdued}`,
    }),
  titleRow: css({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  }),
  closeButton: css({
    marginRight: '-4px',
  }),
  title: css({
    margin: 0,
    fontSize: '12.25px',
    lineHeight: '20px',
  }),
  searchRow: css({
    '& .euiFieldSearch': {
      width: '100%',
    },
  }),
  body: css({
    height: '640px',
    overflow: 'hidden',
  }),
  leftColumn: ({ euiTheme }: UseEuiTheme) =>
    css({
      flex: '0 0 50%',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      borderRight: `1px solid ${euiTheme.colors.borderBaseSubdued}`,
    }),
  listViewport: css({
    flex: 1,
    minHeight: 0,
    position: 'relative',
    overflow: 'hidden',
  }),
  listPane: ({ euiTheme }: UseEuiTheme) =>
    css({
      height: '100%',
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: euiTheme.colors.backgroundBasePlain,
      willChange: 'transform',
      '& > *': {
        flex: 1,
        minHeight: 0,
      },
    }),
  breadcrumbRow: ({ euiTheme }: UseEuiTheme) =>
    css({
      flexShrink: 0,
      // Overlap the header border so subpixel centering (panel translate) can't leave a hairline
      marginTop: -1,
      padding: `8px 16px`,
      borderBottom: `1px solid ${euiTheme.colors.borderBaseSubdued}`,
      backgroundColor: euiTheme.colors.backgroundBasePlain,
      position: 'relative',
      zIndex: 1,
      fontSize: '12px',
      '& .euiBreadcrumb, & .euiBreadcrumb__content, & .euiBreadcrumbs__list': {
        fontSize: '12px',
      },
    }),
  noResults: css({
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '16px',
    padding: '24px',
  }),
  rightColumn: ({ euiTheme }: UseEuiTheme) =>
    css({
      flex: 1,
      overflow: 'hidden',
      backgroundColor: euiTheme.colors.backgroundBaseSubdued,
    }),
  selectable: ({ euiTheme }: UseEuiTheme) =>
    css({
      flex: 1,
      minHeight: 0,
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: euiTheme.colors.backgroundBasePlain,
      '& .euiSelectableListItem': {
        padding: 0,
        borderBottom: `1px solid ${euiTheme.colors.borderBaseSubdued}`,
      },
      '& .euiSelectableListItem:last-child': {
        borderBottom: 'none',
      },
      '& .euiSelectableList': {
        flex: 1,
        height: '100%',
        maxHeight: 'none',
        overflowY: 'auto',
        padding: 0,
      },
      '& .euiSelectableList__list': {
        // Kill EUI scroll-shadow inset so the first row sits flush under breadcrumbs
        paddingTop: '0 !important',
        maskImage: 'none',
        WebkitMaskImage: 'none',
        '&::before, &::after': {
          content: 'none !important',
          display: 'none !important',
        },
        // Breathing room under the search header when a section label leads the list
        '& > ul:has(> .euiSelectableList__groupLabel:first-child)': {
          paddingTop: '16px',
        },
      },
      '& .euiSelectableList__groupLabel': {
        position: 'sticky',
        top: 0,
        zIndex: 2,
        padding: `6px 12px 6px 16px`,
        fontSize: '12.25px',
        fontWeight: 700,
        color: euiTheme.colors.textParagraph,
        borderBottom: `1px solid ${euiTheme.colors.borderBaseSubdued}`,
        // Opaque so list rows don't show through while the header is stuck
        backgroundColor: euiTheme.colors.backgroundBasePlain,
        // EUI draws a top rule via ::before on later section labels — remove it
        '&::before': {
          content: 'none',
          display: 'none',
        },
      },
      // Exactly 24px from the previous item to the next section label text
      // (EUI also adds extra padding-top on later labels — zero that out).
      '& .euiSelectableList__groupLabel ~ .euiSelectableList__groupLabel': {
        marginTop: '24px',
        paddingTop: 0,
      },
      '& .euiSelectableListItem__content': {
        gap: 0,
      },
      '& .euiSelectableListItem__text': {
        padding: 0,
        // Never underline option text — EUI focus/hover styles add it by default
        textDecoration: 'none !important',
      },
      // EUI keeps a focused row after mouseDown; that must not compete with :hover.
      // Only the hovered row should show the highlight (one at a time).
      '& .euiSelectableListItem.euiSelectableListItem-isFocused:not(:hover), & .euiSelectableListItem[aria-selected="true"]:not(:hover)':
        {
          backgroundColor: `${euiTheme.colors.backgroundBasePlain} !important`,
          color: 'inherit',
        },
      '& .euiSelectableListItem:hover': {
        backgroundColor: euiTheme.colors.backgroundBaseSubdued,
        color: 'inherit',
      },
      // Info / plus affordances only on hovered leaf rows
      '& .euiSelectableListItem .rowActions': {
        opacity: 0,
        pointerEvents: 'none',
      },
      '& .euiSelectableListItem:hover .rowActions': {
        opacity: 1,
        pointerEvents: 'auto',
      },
    }),
  actionOptionWrapper: css({
    width: '100%',
    padding: `12px 16px`,
  }),
  compactOptionWrapper: css({
    width: '100%',
    padding: `12px 16px`,
  }),
  actionOption: css({
    gap: '11px',
  }),
  actionInfo: css({
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  }),
  // Icon tile — 40x40, 8px radius
  iconOuter: css({
    width: '40px',
    height: '40px',
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '8px',
    boxSizing: 'border-box',
  }),
  // Platform (AI, Data transformation, Cases) — Vis2 fill + strong primary border
  iconOuterPlatform: ({ euiTheme }: UseEuiTheme) =>
    css({
      backgroundColor: euiTheme.colors.vis.euiColorVis2,
      border: `1px solid ${euiTheme.colors.borderStrongPrimary}`,
    }),
  // Triggers — Vis4 fill + strong accent border
  iconOuterTrigger: ({ euiTheme }: UseEuiTheme) =>
    css({
      backgroundColor: euiTheme.colors.vis.euiColorVis4,
      border: `1px solid ${euiTheme.colors.borderStrongAccent}`,
    }),
  // App logos (ES, Kibana) + External — plain white + prominent border
  iconOuterAppLogo: ({ euiTheme }: UseEuiTheme) =>
    css({
      backgroundColor: euiTheme.colors.backgroundBasePlain,
      border: `1px solid ${euiTheme.colors.borderBaseProminent}`,
    }),
  // Commands — subdued background + prominent border
  iconOuterCommand: ({ euiTheme }: UseEuiTheme) =>
    css({
      backgroundColor: euiTheme.colors.backgroundBaseSubdued,
      border: `1px solid ${euiTheme.colors.borderBaseProminent}`,
    }),
  // Data transformation — Vis8 fill + strong warning border
  iconOuterDataTransformation: ({ euiTheme }: UseEuiTheme) =>
    css({
      backgroundColor: euiTheme.colors.vis.euiColorVis8,
      border: `1px solid ${euiTheme.colors.borderStrongWarning}`,
    }),
  // Flow control — Vis0 fill + strong accent-secondary border
  iconOuterFlowControl: ({ euiTheme }: UseEuiTheme) =>
    css({
      backgroundColor: euiTheme.colors.vis.euiColorVis0,
      border: `1px solid ${euiTheme.colors.borderStrongAccentSecondary}`,
    }),
  groupIconInner: css({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '16px',
    height: '16px',
  }),
  actionIconInner: css({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '16px',
    height: '16px',
  }),
  arrowContainer: css({
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
  }),
  arrow: ({ euiTheme }: UseEuiTheme) =>
    css({
      color: euiTheme.colors.textSubdued,
    }),
  rowActions: css({
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: '4px',
  }),
  // 32×32 empty icon buttons (no border / fill) — Info + Add
  rowActionButton: css({
    inlineSize: '32px',
    blockSize: '32px',
    width: '32px',
    height: '32px',
  }),
  viewAllLink: ({ euiTheme }: UseEuiTheme) =>
    css({
      cursor: 'pointer',
      width: '100%',
      color: euiTheme.colors.primaryText,
      '& .euiIcon': {
        color: euiTheme.colors.primaryText,
      },
    }),
  actionTitle: (euiThemeContext: UseEuiTheme) =>
    css({
      lineHeight: euiFontSize(euiThemeContext, 's').lineHeight,
      '&::first-letter': {
        textTransform: 'capitalize',
      },
      '& h6': {
        fontSize: '12.25px',
        fontWeight: 700,
      },
    }),
  actionDescription: (euiThemeContext: UseEuiTheme) =>
    css({
      lineHeight: euiFontSize(euiThemeContext, 's').lineHeight,
      fontSize: '12px',
      color: euiThemeContext.euiTheme.colors.textSubdued,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
      display: 'block',
    }),
  techPreviewBadge: css({
    marginBottom: '-4px',
  }),
  shortcutContainer: css({
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'nowrap',
    alignItems: 'center',
    gap: 2,
    flexShrink: 0,
  }),
  // Match Keyboard shortcuts panel / Actions menu button kbd chips
  shortcutKey: ({ euiTheme }: UseEuiTheme) =>
    css({
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: 20,
      textAlign: 'center',
      padding: `${euiTheme.size.xxs} ${euiTheme.size.xs}`,
      borderRadius: euiTheme.border.radius.small,
      border: `${euiTheme.border.width.thin} solid ${euiTheme.colors.borderBaseSubdued}`,
      backgroundColor: 'transparent',
      color: euiTheme.colors.textSubdued,
      fontFamily: euiTheme.font.familyCode,
      fontSize: '12px',
      fontWeight: euiTheme.font.weight.medium,
      lineHeight: 1,
      whiteSpace: 'nowrap',
      boxSizing: 'border-box',
    }),
};
