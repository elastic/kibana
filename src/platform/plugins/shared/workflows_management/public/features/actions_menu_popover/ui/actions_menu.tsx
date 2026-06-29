/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EuiSelectableOption, UseEuiTheme } from '@elastic/eui';
import {
  EuiBetaBadge,
  EuiButtonEmpty,
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
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { ActionsMenuPreviewPanel } from './actions_menu_preview_panel';
import { useKibana } from '../../../hooks/use_kibana';
import { getBaseConnectorType } from '../../../shared/ui/step_icons/get_base_connector_type';
import { StepIcon } from '../../../shared/ui/step_icons/step_icon';
import { flattenOptions, getActionOptions } from '../lib/get_action_options';
import { STEPS_PREFIX, useDisplayOptions } from '../lib/use_display_options';
import {
  type ActionOptionData,
  type EditorCommand,
  getMenuItemData,
  isActionConnectorGroup,
  isActionConnectorOption,
  isActionGroup,
  isActionOption,
  type JumpToStepEntry,
} from '../types';

export type { EditorCommand, JumpToStepEntry };

export interface ActionsMenuProps {
  onActionSelected: (action: ActionOptionData) => void;
  commands?: EditorCommand[];
  jumpToStepEntries?: JumpToStepEntry[];
  onCommandSelected?: (commandId: string) => void;
  onJumpToStep?: (lineNumber: number) => void;
  onClose?: () => void;
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
  const defaultOptions = useMemo(
    () => getActionOptions(euiTheme, workflowsExtensions),
    [euiTheme, workflowsExtensions]
  );
  const flatOptions = useMemo(() => flattenOptions(defaultOptions), [defaultOptions]);

  const [options, setOptions] = useState<ActionOptionData[]>(defaultOptions);
  const [currentPath, setCurrentPath] = useState<Array<string>>([]);
  const [hoveredOption, setHoveredOption] = useState<ActionOptionData | null>(null);

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
    searchTerm,
    commands,
    jumpToStepEntries,
    currentPath,
  });

  const handleMouseEnter = useCallback((action: ActionOptionData) => {
    setHoveredOption(action);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHoveredOption(null);
  }, []);

  const renderActionOption = (rawOption: EuiSelectableOption, searchValue: string) => {
    const itemData = getMenuItemData(rawOption);
    const effectiveSearch = searchValue.startsWith(STEPS_PREFIX)
      ? searchValue.slice(STEPS_PREFIX.length).trim()
      : searchValue.startsWith('#')
      ? searchValue.slice(1).trim()
      : searchValue;

    if (itemData?.kind === 'command' || itemData?.kind === 'jump') {
      return (
        <div css={styles.compactOptionWrapper}>
          <EuiText size="s">
            <EuiHighlight search={effectiveSearch}>{rawOption.label}</EuiHighlight>
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

    return (
      <div
        css={styles.actionOptionWrapper}
        className="actionOptionWrapper"
        onMouseEnter={() => handleMouseEnter(action)}
      >
        <EuiFlexGroup alignItems="center" css={styles.actionOption} gutterSize="none">
          <EuiFlexItem
            grow={false}
            css={[
              styles.iconOuter,
              action.iconColor === euiTheme.colors.vis.euiColorVis6
                ? styles.iconOuterPink
                : styles.iconOuterBlue,
            ]}
          >
            <span css={shouldUseGroupStyle ? styles.groupIconInner : styles.actionIconInner}>
              {isActionConnectorGroup(action) || isActionConnectorOption(action) ? (
                <StepIcon
                  stepType={getBaseConnectorType(action.connectorType)}
                  executionStatus={undefined}
                />
              ) : isActionGroup(action) || isActionOption(action) ? (
                <EuiIcon
                  type={action.iconType}
                  size="m"
                  color={action.iconColor}
                  aria-hidden={true}
                />
              ) : null}
            </span>
          </EuiFlexItem>
          <EuiFlexGroup direction="column" gutterSize="none" css={styles.actionInfo}>
            <EuiFlexItem>
              <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" gutterSize="none">
                <EuiFlexGroup alignItems="center" gutterSize="s">
                  <EuiTitle size="xxxs" css={styles.actionTitle}>
                    <h6>
                      <EuiHighlight search={effectiveSearch}>{action.label}</EuiHighlight>
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
                <EuiHighlight search={effectiveSearch}>{action.description || ''}</EuiHighlight>
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
          {shouldUseGroupStyle && (
            <EuiFlexItem grow={false} css={styles.arrowContainer}>
              <EuiIcon type="arrowRight" size="s" css={styles.arrow} aria-hidden={true} />
            </EuiFlexItem>
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

  const handleStepOrGroupSelected = useCallback(
    (action: ActionOptionData) => {
      if (isActionGroup(action)) {
        const nextPath = action.pathIds ?? [...currentPath, action.id];
        setCurrentPath([...nextPath]);
        setSearchTerm('');
        setOptions(action.options);
      } else {
        onActionSelected(action);
      }
    },
    [currentPath, onActionSelected]
  );

  const handleBack = () => {
    const nextPath = currentPath.slice(0, -1);
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
  };

  /** Lower rank = higher priority in search results. */
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

    if (searchValue.trimStart().startsWith('#')) return;

    if (searchValue.length > 0) {
      const term = searchValue.trim().toLowerCase();
      if (term.length === 0) {
        setOptions(flatOptions);
        return;
      }
      const matches = flatOptions
        .filter((option) => isActionSearchMatch(option, term))
        .sort((a, b) => {
          const rankDiff = getActionMatchRank(a, term) - getActionMatchRank(b, term);
          return rankDiff !== 0 ? rankDiff : a.label.localeCompare(b.label);
        });
      setOptions(matches);
    } else {
      setOptions(defaultOptions);
    }
  };

  const displayOptionsNoTooltip = useMemo(
    () => displayOptions.map((o) => ({ ...o, toolTipContent: '' })),
    [displayOptions]
  );

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
        name: 'actions-menu-search',
        placeholder: i18n.translate('workflows.actionsMenu.searchPlaceholder', {
          defaultMessage: 'Search step, command or # to go to a step',
        }),
        value: searchTerm,
        onChange: handleSearchChange,
        compressed: true,
      }}
      listProps={{
        showIcons: false,
        isVirtualized: searchTerm.startsWith(STEPS_PREFIX),
        ...(searchTerm.startsWith(STEPS_PREFIX) && { rowHeight: 64 }),
      }}
      renderOption={renderActionOption}
      css={styles.selectable}
      singleSelection
    >
      {(list, search) => (
        <div css={styles.container}>
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

          {/* Two-column body */}
          <EuiFlexGroup gutterSize="none" css={styles.body} onMouseLeave={handleMouseLeave}>
            {/* Left column — list */}
            <EuiFlexItem css={styles.leftColumn}>
              {currentPath.length > 0 && (
                <div css={styles.backRow}>
                  <EuiButtonEmpty
                    onClick={handleBack}
                    iconType="chevronSingleLeft"
                    size="xs"
                    flush="left"
                    aria-label={i18n.translate('workflows.actionsMenu.back', {
                      defaultMessage: 'Back',
                    })}
                  >
                    <FormattedMessage id="workflows.actionsMenu.back" defaultMessage="Back" />
                  </EuiButtonEmpty>
                </div>
              )}
              {list}
            </EuiFlexItem>

            {/* Right column — preview */}
            <EuiFlexItem css={styles.rightColumn}>
              <ActionsMenuPreviewPanel
                hoveredOption={hoveredOption}
                onStepSelected={handleStepOrGroupSelected}
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
      padding: `12px ${euiTheme.size.base}`,
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
  backRow: ({ euiTheme }: UseEuiTheme) =>
    css({
      flexShrink: 0,
      padding: `6px 12px 6px 8px`,
      borderTop: `1px solid ${euiTheme.colors.borderBaseSubdued}`,
      borderBottom: `1px solid ${euiTheme.colors.borderBaseSubdued}`,
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
        paddingBlock: 0,
        paddingInline: 0,
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
        paddingTop: 0,
      },
      '& .euiSelectableList__groupLabel': {
        padding: `6px 12px 6px 16px`,
        fontSize: '12.25px',
        fontWeight: 700,
        color: euiTheme.colors.textParagraph,
        borderTop: `1px solid ${euiTheme.colors.borderBaseSubdued}`,
        borderBottom: `1px solid ${euiTheme.colors.borderBaseSubdued}`,
      },
      '& .euiSelectableList__groupLabel ~ .euiSelectableList__groupLabel': {
        marginTop: '24px',
      },
      '& .euiSelectableListItem__text': {
        padding: 0,
      },
      '& .euiSelectableListItem[aria-selected="true"]': {
        backgroundColor: euiTheme.colors.backgroundBaseSubdued,
      },
      '& .euiSelectableListItem:hover .actionOptionWrapper': {
        backgroundColor: euiTheme.colors.backgroundBaseSubdued,
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
  // Figma: Icon Container — 40x40 r=8
  iconOuter: css({
    width: '40px',
    height: '40px',
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '8px',
  }),
  // Figma: fill=rgba(241,246,255) stroke=rgba(191,219,255)
  iconOuterBlue: css({
    backgroundColor: 'rgba(241, 246, 255)',
    border: '1px solid rgba(191, 219, 255)',
  }),
  // Figma: fill=rgba(255,235,242,0.6) stroke=rgba(255,199,219)
  iconOuterPink: css({
    backgroundColor: 'rgba(255, 235, 242)',
    border: '1px solid rgba(255, 199, 219)',
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
    }),
  techPreviewBadge: css({
    marginBottom: '-4px',
  }),
};
