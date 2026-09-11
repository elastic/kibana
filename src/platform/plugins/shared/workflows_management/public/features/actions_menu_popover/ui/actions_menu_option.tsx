/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EuiSelectableOption, EuiThemeComputed } from '@elastic/eui';
import {
  EuiBetaBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHighlight,
  EuiIcon,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import React from 'react';
import type { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import { i18n } from '@kbn/i18n';
import { getBaseConnectorType } from '@kbn/workflows-ui';
import type { componentStyles } from './actions_menu.styles';
import { ActionsMenuAiIcon } from './ai_icon_tile';
import { StepIcon } from '../../../shared/ui/step_icons/step_icon';
import { getIconGlyphColor } from '../lib/get_action_options';
import { STEPS_PREFIX } from '../lib/use_display_options';
import {
  type ActionOptionData,
  getMenuItemData,
  type IconVariant,
  isActionConnectorGroup,
  isActionConnectorOption,
  isActionGroup,
  isActionOption,
} from '../types';

export const KEYBOARD_ACTIVE_CLASS = 'actionsMenu-keyboardActive';

type ActionsMenuStyles = ReturnType<typeof useMemoCss<typeof componentStyles>>;

function getSelectableOptionKey(option: EuiSelectableOption): string | undefined {
  const itemData = getMenuItemData(option);
  if (!itemData) {
    const id = getOptionActionId(option);
    return id ? `action:${id}` : undefined;
  }
  switch (itemData.kind) {
    case 'action':
      return `action:${itemData.action.id}`;
    case 'command':
      return `command:${itemData.command.id}`;
    case 'jump':
      return `jump:${itemData.entry.id}`;
    case 'nav':
      return `nav:${itemData.target}`;
    default: {
      const exhaustiveCheck: never = itemData;
      return exhaustiveCheck;
    }
  }
}

export function getOptionActionId(option: EuiSelectableOption): string | undefined {
  const itemData = getMenuItemData(option);
  if (itemData?.kind === 'action') {
    return itemData.action.id;
  }
  return (option as { id?: string }).id;
}

function getIconOuterStyle(variant: IconVariant | undefined, styles: ActionsMenuStyles) {
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
      return styles.iconOuterPlatform;
    case undefined:
      return styles.iconOuterPlatform;
    default: {
      const exhaustiveCheck: never = variant;
      return exhaustiveCheck;
    }
  }
}

interface RenderActionOptionParams {
  rawOption: EuiSelectableOption;
  searchValue: string;
  searchTerm: string;
  keyboardIndex: number | null;
  actionableDisplayOptions: EuiSelectableOption[];
  styles: ActionsMenuStyles;
  euiTheme: EuiThemeComputed;
}

export function renderActionOption({
  rawOption,
  searchValue,
  searchTerm,
  keyboardIndex,
  actionableDisplayOptions,
  styles,
  euiTheme,
}: RenderActionOptionParams): React.ReactNode {
  const itemData = getMenuItemData(rawOption);
  const rawSearch = (searchTerm || searchValue).trim();
  const effectiveSearch = rawSearch.startsWith(STEPS_PREFIX)
    ? rawSearch.slice(STEPS_PREFIX.length).trim()
    : rawSearch.startsWith('#')
    ? rawSearch.slice(1).trim()
    : rawSearch;

  const keyboardOption =
    keyboardIndex != null ? actionableDisplayOptions[keyboardIndex] : undefined;
  const isKeyboardActive =
    keyboardOption != null &&
    getSelectableOptionKey(keyboardOption) != null &&
    getSelectableOptionKey(keyboardOption) === getSelectableOptionKey(rawOption);
  const keyboardActiveClassName = isKeyboardActive ? KEYBOARD_ACTIVE_CLASS : undefined;

  if (itemData?.kind === 'command') {
    const { command } = itemData;
    return (
      <div
        css={styles.actionOptionWrapper}
        className={keyboardActiveClassName}
        data-command-id={command.id}
      >
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
      <div
        css={styles.compactOptionWrapper}
        className={keyboardActiveClassName}
        data-jump-id={itemData.entry.id}
      >
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
      <div css={styles.compactOptionWrapper} className={keyboardActiveClassName}>
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
            <EuiIcon type="chevronSingleRight" size="s" color="primary" aria-hidden={true} />
          </EuiFlexItem>
        </EuiFlexGroup>
      </div>
    );
  }

  const action =
    itemData?.kind === 'action' ? itemData.action : (rawOption as unknown as ActionOptionData);
  const shouldUseGroupStyle = isActionGroup(action) || isActionConnectorGroup(action);
  const glyphColor =
    getIconGlyphColor(action.iconVariant, euiTheme) ??
    ('iconColor' in action ? action.iconColor : undefined);

  return (
    <div
      css={styles.actionOptionWrapper}
      className={['actionOptionWrapper', keyboardActiveClassName].filter(Boolean).join(' ')}
      data-option-id={action.id}
    >
      <EuiFlexGroup alignItems="center" css={styles.actionOption} gutterSize="none">
        <EuiFlexItem
          grow={false}
          css={[styles.iconOuter, getIconOuterStyle(action.iconVariant, styles)]}
        >
          <span css={shouldUseGroupStyle ? styles.groupIconInner : styles.actionIconInner}>
            {isActionConnectorGroup(action) || isActionConnectorOption(action) ? (
              'iconType' in action && action.iconType === 'sparkles' ? (
                <ActionsMenuAiIcon />
              ) : (
                <StepIcon
                  stepType={getBaseConnectorType(action.connectorType)}
                  executionStatus={undefined}
                />
              )
            ) : isActionGroup(action) || isActionOption(action) ? (
              action.iconType === 'sparkles' ? (
                <ActionsMenuAiIcon />
              ) : (
                <EuiIcon type={action.iconType} size="m" color={glyphColor} aria-hidden={true} />
              )
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
            <EuiIcon type="chevronSingleRight" size="s" css={styles.arrow} aria-hidden={true} />
          </EuiFlexItem>
        ) : null}
      </EuiFlexGroup>
    </div>
  );
}
