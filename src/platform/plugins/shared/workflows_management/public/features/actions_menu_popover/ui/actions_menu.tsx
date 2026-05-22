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
import React, { useEffect, useMemo, useState } from 'react';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
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
  const defaultOptions = useMemo(
    () => getActionOptions(euiTheme, workflowsExtensions),
    [euiTheme, workflowsExtensions]
  );
  const flatOptions = useMemo(() => flattenOptions(defaultOptions), [defaultOptions]);

  const [options, setOptions] = useState<ActionOptionData[]>(defaultOptions);
  const [currentPath, setCurrentPath] = useState<Array<string>>([]);

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

  const renderActionOption = (rawOption: EuiSelectableOption, searchValue: string) => {
    const itemData = getMenuItemData(rawOption);
    const effectiveSearch = searchValue.startsWith(STEPS_PREFIX)
      ? searchValue.slice(STEPS_PREFIX.length).trim()
      : searchValue.startsWith('#')
      ? searchValue.slice(1).trim()
      : searchValue;

    if (itemData?.kind === 'command' || itemData?.kind === 'jump') {
      return (
        <EuiText size="s">
          <EuiHighlight search={effectiveSearch}>{rawOption.label}</EuiHighlight>
        </EuiText>
      );
    }

    if (itemData?.kind === 'nav') {
      return (
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
      );
    }

    const action =
      itemData?.kind === 'action' ? itemData.action : (rawOption as unknown as ActionOptionData);
    const shouldUseGroupStyle = isActionGroup(action);
    return (
      <EuiFlexGroup alignItems="center" css={styles.actionOption}>
        <EuiFlexItem
          grow={false}
          css={[
            styles.iconOuter,
            shouldUseGroupStyle ? styles.groupIconOuter : styles.actionIconOuter,
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
        <EuiFlexGroup direction="column" gutterSize="none">
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
      </EuiFlexGroup>
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
    if (isActionGroup(action)) {
      const nextPath = action.pathIds ?? [...currentPath, action.id];
      setCurrentPath([...nextPath]);
      setSearchTerm('');
      setOptions(action.options);
    } else {
      onActionSelected(action);
    }
  };

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

  /** Lower rank = higher priority in search results (see getActionMatchRank). */
  const MAX_ACTION_MATCH_RANK = 5;

  const getActionMatchRank = (option: ActionOptionData, normalizedTerm: string): number => {
    if (!normalizedTerm) {
      return 0;
    }
    const id = option.id.toLowerCase();
    const label = option.label.toLowerCase();
    const description = option.description?.toLowerCase() ?? '';

    if (id === normalizedTerm) {
      return 0;
    }
    if (label === normalizedTerm) {
      return 1;
    }
    if (description === normalizedTerm) {
      return 2;
    }
    if (id.includes(normalizedTerm)) {
      return 3;
    }
    if (label.includes(normalizedTerm)) {
      return 4;
    }
    if (description.includes(normalizedTerm)) {
      return 5;
    }
    return MAX_ACTION_MATCH_RANK + 1;
  };

  const isActionSearchMatch = (option: ActionOptionData, normalizedTerm: string) =>
    getActionMatchRank(option, normalizedTerm) <= MAX_ACTION_MATCH_RANK;

  // Filtering is handled by handleSearchChange + useDisplayOptions;
  // override EuiSelectable's built-in matcher so it doesn't double-filter.
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

    if (searchValue.trimStart().startsWith('#')) {
      return;
    }

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

  return (
    <EuiSelectable
      aria-label={i18n.translate('workflows.actionsMenu.ariaLabel', {
        defaultMessage: 'Actions menu',
      })}
      searchable
      options={displayOptions}
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
      }}
      listProps={{
        showIcons: false,
        // Normal mode mixes tall action rows (~76px) with compact command/jump
        // rows (~36px) and has at most ~15 items, so virtualization is off.
        // "Steps:" mode shows the full step catalog (uniform action rows) and
        // benefits from virtualization to avoid DOM bloat.
        isVirtualized: searchTerm.startsWith(STEPS_PREFIX),
        ...(searchTerm.startsWith(STEPS_PREFIX) && { rowHeight: 76 }),
      }}
      renderOption={renderActionOption}
      css={styles.selectable}
      singleSelection
    >
      {(list, search) => (
        <>
          <EuiFlexGroup direction="column" gutterSize="s" css={styles.header}>
            <EuiFlexItem css={styles.title}>
              <EuiTitle size="xxs">
                {currentPath.length === 0 ? (
                  <h3>
                    <FormattedMessage
                      id="workflows.actionsMenu.title"
                      defaultMessage="Actions menu"
                    />
                  </h3>
                ) : (
                  <EuiButtonEmpty
                    onClick={handleBack}
                    iconType="chevronSingleLeft"
                    size="xs"
                    aria-label={i18n.translate('workflows.actionsMenu.back', {
                      defaultMessage: 'Back',
                    })}
                  >
                    <FormattedMessage id="workflows.actionsMenu.back" defaultMessage="Back" />
                  </EuiButtonEmpty>
                )}
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem>{search}</EuiFlexItem>
          </EuiFlexGroup>

          {list}
        </>
      )}
    </EuiSelectable>
  );
}

const componentStyles = {
  selectable: ({ euiTheme }: UseEuiTheme) =>
    css({
      backgroundColor: euiTheme.colors.backgroundBasePlain,
      '& .euiSelectableListItem': {
        paddingBlock: euiTheme.size.m,
        paddingInline: '16px',
      },
      '& .euiSelectableListItem.compactOption': {
        paddingBlock: euiTheme.size.s,
      },
      '& .euiSelectableList': {
        maxHeight: '420px',
        overflowY: 'auto',
      },
      '& .euiSelectableList__groupLabel': {
        borderBottom: euiTheme.border.thin,
      },
      '& .euiSelectableList__groupLabel ~ .euiSelectableList__groupLabel': {
        marginTop: '24px',
      },
    }),
  title: css({
    display: 'flex',
    alignItems: 'flex-start',
    minHeight: '24px',
  }),
  header: ({ euiTheme }: UseEuiTheme) =>
    css({
      padding: euiTheme.size.m,
    }),
  actionOption: css({
    gap: '12px',
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
  iconOuter: ({ euiTheme }: UseEuiTheme) =>
    css({
      width: '40px',
      height: '40px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      border: `1px solid ${euiTheme.colors.borderBasePlain}`,
      borderRadius: euiTheme.border.radius.medium,
    }),
  groupIconOuter: ({ euiTheme }: UseEuiTheme) => css({}),
  actionIconOuter: ({ euiTheme }: UseEuiTheme) => css({}),
  groupIconInner: ({ euiTheme }: UseEuiTheme) => css({}),
  actionIconInner: ({ euiTheme }: UseEuiTheme) =>
    css({
      width: '24px',
      height: '24px',
      borderRadius: '100%',
      backgroundColor: euiTheme.colors.backgroundBasePlain,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }),
  actionTitle: (euiThemeContext: UseEuiTheme) =>
    css({
      lineHeight: euiFontSize(euiThemeContext, 's').lineHeight,
      '&::first-letter': {
        textTransform: 'capitalize',
      },
    }),
  actionDescription: (euiThemeContext: UseEuiTheme) =>
    css({
      lineHeight: euiFontSize(euiThemeContext, 's').lineHeight,
    }),
  techPreviewBadge: css({
    marginBottom: '-4px',
  }),
};
