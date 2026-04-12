/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EuiSelectableOption, IconType, UseEuiTheme } from '@elastic/eui';
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
import {
  type ActionOptionData,
  isActionConnectorGroup,
  isActionConnectorOption,
  isActionGroup,
  isActionOption,
} from '../types';

export interface EditorCommand {
  id: string;
  label: string;
  iconType: IconType;
  description?: string;
}

export interface JumpToStepEntry {
  id: string;
  label: string;
  lineStart: number;
}

export interface ActionsMenuProps {
  onActionSelected: (action: ActionOptionData) => void;
  commands?: EditorCommand[];
  jumpToStepEntries?: JumpToStepEntry[];
  onCommandSelected?: (commandId: string) => void;
  onJumpToStep?: (lineNumber: number) => void;
}

const STEPS_PREFIX = 'Steps: ';
const MAX_VISIBLE_STEPS = 7;

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

  const renderActionOption = (rawOption: EuiSelectableOption, searchValue: string) => {
    const optionId = String((rawOption as unknown as Record<string, unknown>).id ?? '');
    const effectiveSearch = searchValue.startsWith(STEPS_PREFIX)
      ? searchValue.slice(STEPS_PREFIX.length).trim()
      : searchValue.startsWith('#')
      ? searchValue.slice(1).trim()
      : searchValue;

    if (optionId.startsWith('__cmd:') || optionId.startsWith('__jump:')) {
      return (
        <EuiText size="s">
          <EuiHighlight search={effectiveSearch}>{rawOption.label}</EuiHighlight>
        </EuiText>
      );
    }

    if (optionId === '__viewAll' || optionId === '__viewExisting') {
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

    const option = rawOption as unknown as ActionOptionData;
    const shouldUseGroupStyle = isActionGroup(option);
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
            {isActionConnectorGroup(option) || isActionConnectorOption(option) ? (
              <StepIcon
                stepType={getBaseConnectorType(option.connectorType)}
                executionStatus={undefined}
              />
            ) : isActionGroup(option) || isActionOption(option) ? (
              <EuiIcon
                type={option.iconType}
                size="m"
                color={option.iconColor}
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
                    <EuiHighlight search={effectiveSearch}>{option.label}</EuiHighlight>
                  </h6>
                </EuiTitle>
                {option.stability === 'tech_preview' && (
                  <EuiBetaBadge
                    iconType="flask"
                    label={i18n.translate('workflows.actionsMenu.techPreviewBadge', {
                      defaultMessage: 'Tech preview',
                    })}
                    size="s"
                    css={styles.techPreviewBadge}
                  />
                )}
                {option.stability === 'beta' && (
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
                {option.instancesLabel}
              </EuiText>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText size="xs" className="eui-displayBlock" css={styles.actionDescription}>
              <EuiHighlight search={effectiveSearch}>{option.description || ''}</EuiHighlight>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexGroup>
    );
  };

  const displayOptions: EuiSelectableOption[] = useMemo(() => {
    const result: EuiSelectableOption[] = [];
    const term = searchTerm.trim().toLowerCase();
    const isStepsMode = searchTerm.startsWith(STEPS_PREFIX);
    const isHashMode = !isStepsMode && searchTerm.trimStart().startsWith('#');
    const hasSearch = term.length > 0;

    // Inside a sub-group: show only group options
    if (currentPath.length > 0) {
      for (const opt of options) {
        result.push(opt as unknown as EuiSelectableOption);
      }
      return result;
    }

    // # mode: show only jump-to-step entries
    if (isHashMode) {
      const jumpTerm = term.slice(1).trim();
      const filteredJumps = (jumpToStepEntries ?? []).filter(
        (entry) => !jumpTerm || entry.id.toLowerCase().includes(jumpTerm)
      );
      if (filteredJumps.length > 0) {
        result.push({ label: 'Jump to a step', isGroupLabel: true });
        for (const entry of filteredJumps) {
          result.push({
            id: `__jump:${entry.id}`,
            label: entry.label,
            className: 'compactOption',
          } as unknown as EuiSelectableOption);
        }
      }
      return result;
    }

    // "Steps: X" mode: show ALL matching step options without limit
    if (isStepsMode) {
      result.push({ label: 'Add step', isGroupLabel: true });
      for (const opt of options) {
        result.push(opt as unknown as EuiSelectableOption);
      }
      return result;
    }

    // Normal mode
    result.push({ label: 'Add step', isGroupLabel: true });
    const visibleOptions = hasSearch ? options.slice(0, MAX_VISIBLE_STEPS) : options;
    for (const opt of visibleOptions) {
      result.push(opt as unknown as EuiSelectableOption);
    }

    if (hasSearch && options.length > MAX_VISIBLE_STEPS) {
      result.push({
        label: i18n.translate('workflows.actionsMenu.viewAllSteps', {
          defaultMessage: 'View all steps to add',
        }),
        id: '__viewAll',
        className: 'compactOption',
      } as unknown as EuiSelectableOption);
    }

    const filteredCmds = (commands ?? []).filter(
      (cmd) => !term || cmd.label.toLowerCase().includes(term)
    );
    if (filteredCmds.length > 0) {
      result.push({ label: 'Commands', isGroupLabel: true });
      for (const cmd of filteredCmds) {
        result.push({
          id: `__cmd:${cmd.id}`,
          label: cmd.label,
          className: 'compactOption',
        } as unknown as EuiSelectableOption);
      }
    }

    if (hasSearch) {
      const filteredJumps = (jumpToStepEntries ?? []).filter(
        (entry) => entry.id.toLowerCase().includes(term) || entry.label.toLowerCase().includes(term)
      );
      if (filteredJumps.length > 0) {
        result.push({ label: 'Jump to a step', isGroupLabel: true });
        for (const entry of filteredJumps) {
          result.push({
            id: `__jump:${entry.id}`,
            label: entry.label,
            className: 'compactOption',
          } as unknown as EuiSelectableOption);
        }
        if ((jumpToStepEntries ?? []).length > filteredJumps.length) {
          result.push({
            label: i18n.translate('workflows.actionsMenu.viewAllExistingSteps', {
              defaultMessage: 'View all existing steps',
            }),
            id: '__viewExisting',
            className: 'compactOption',
          } as unknown as EuiSelectableOption);
        }
      }
    }

    return result;
  }, [options, searchTerm, commands, jumpToStepEntries, currentPath]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleChange = (_: any, __: any, selectedOption: any) => {
    const optionId: string = selectedOption?.id ?? '';

    if (optionId === '__viewAll') {
      const currentQuery = searchTerm.trim();
      setSearchTerm(`${STEPS_PREFIX}${currentQuery}`);
      return;
    }
    if (optionId === '__viewExisting') {
      setSearchTerm('#');
      return;
    }
    if (optionId.startsWith('__cmd:')) {
      onCommandSelected?.(optionId.slice(6));
      return;
    }
    if (optionId.startsWith('__jump:')) {
      const entry = jumpToStepEntries?.find((e) => e.id === optionId.slice(7));
      if (entry) onJumpToStep?.(entry.lineStart);
      return;
    }

    if (isActionGroup(selectedOption)) {
      const nextPath = selectedOption.pathIds ?? [...currentPath, selectedOption.id];
      setCurrentPath([...nextPath]);
      setSearchTerm('');
      setOptions(selectedOption.options);
    } else {
      onActionSelected(selectedOption);
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

  // Filtering is handled by handleSearchChange + displayOptions;
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
        isVirtualized: false,
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
