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
import React, { useMemo, useState } from 'react';
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

export interface ActionsMenuProps {
  onActionSelected: (action: ActionOptionData) => void;
}

export function ActionsMenu({ onActionSelected }: ActionsMenuProps) {
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
  const renderActionOption = (option: ActionOptionData, searchValue: string) => {
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
              <EuiIcon type={option.iconType} size="m" color={option.iconColor} />
            ) : null}
          </span>
        </EuiFlexItem>
        <EuiFlexGroup direction="column" gutterSize="none">
          <EuiFlexItem>
            <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" gutterSize="none">
              <EuiTitle size="xxxs" css={styles.actionTitle}>
                <h6>
                  <EuiHighlight search={searchValue}>{option.label}</EuiHighlight>
                </h6>
              </EuiTitle>
              <EuiText color="subdued" size="xs">
                {option.instancesLabel}
              </EuiText>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText size="xs" className="eui-displayBlock" css={styles.actionDescription}>
              <EuiHighlight search={searchValue}>{option.description || ''}</EuiHighlight>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexGroup>
    );
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleChange = (_: Array<ActionOptionData>, __: any, selectedOption: ActionOptionData) => {
    if (isActionGroup(selectedOption)) {
      setCurrentPath([...currentPath, selectedOption.id]);
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

  const optionMatcher = ({
    option,
    searchValue,
    normalizedSearchValue,
  }: {
    option: ActionOptionData;
    searchValue: string;
    normalizedSearchValue: string;
  }) => {
    return (
      option.id.toLowerCase().includes(normalizedSearchValue) ||
      option.label.toLowerCase().includes(normalizedSearchValue) ||
      !!option.description?.toLowerCase().includes(normalizedSearchValue)
    );
  };

  const handleSearchChange = (searchValue: string) => {
    setSearchTerm(searchValue);
    if (searchValue.length > 0) {
      const term = searchValue.trim().toLowerCase();
      const matches = flatOptions.filter((option) =>
        optionMatcher({ option, searchValue, normalizedSearchValue: term })
      );
      setOptions(matches);
    } else {
      setOptions(defaultOptions);
    }
  };

  return (
    <EuiSelectable
      aria-label="Selectable example with custom list items"
      searchable
      options={options as EuiSelectableOption<ActionOptionData>[]}
      onChange={handleChange}
      optionMatcher={optionMatcher}
      searchProps={{
        id: 'actions-menu-search',
        name: 'actions-menu-search',
        value: searchTerm,
        onChange: handleSearchChange,
      }}
      listProps={{
        rowHeight: 64,
        showIcons: false,
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
                      id="workflows.actionsMenu.selectAction"
                      defaultMessage="Select an action"
                    />
                  </h3>
                ) : (
                  <EuiButtonEmpty
                    onClick={handleBack}
                    iconType="arrowLeft"
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
    }),
  title: css({
    display: 'flex',
    alignItems: 'flex-start',
    // to avoid layout shift when the header is button
    minHeight: '24px',
  }),
  header: ({ euiTheme }: UseEuiTheme) =>
    css({
      padding: euiTheme.size.m,
    }),
  actionOption: css({
    gap: '12px',
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
};
