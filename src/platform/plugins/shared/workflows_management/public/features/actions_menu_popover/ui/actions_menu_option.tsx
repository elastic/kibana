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
import { getActionIconTileVariantStyle } from './action_icon_tile.styles';
import type { componentStyles } from './actions_menu.styles';
import { ActionsMenuAiIcon } from './ai_icon_tile';
import { StepIcon } from '../../../shared/ui/step_icons/step_icon';
import { getIconGlyphColor } from '../lib/get_action_options';
import { STEPS_PREFIX } from '../lib/use_display_options';
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

function getEffectiveSearch(searchTerm: string, searchValue: string): string {
  const rawSearch = (searchTerm || searchValue).trim();
  if (rawSearch.startsWith(STEPS_PREFIX)) {
    return rawSearch.slice(STEPS_PREFIX.length).trim();
  }
  if (rawSearch.startsWith('#')) {
    return rawSearch.slice(1).trim();
  }
  return rawSearch;
}

function getKeyboardActiveClassName(
  rawOption: EuiSelectableOption,
  keyboardIndex: number | null,
  actionableDisplayOptions: EuiSelectableOption[]
): string | undefined {
  const keyboardOption =
    keyboardIndex != null ? actionableDisplayOptions[keyboardIndex] : undefined;
  if (keyboardOption == null) {
    return undefined;
  }
  const keyboardKey = getSelectableOptionKey(keyboardOption);
  if (keyboardKey == null || keyboardKey !== getSelectableOptionKey(rawOption)) {
    return undefined;
  }
  return KEYBOARD_ACTIVE_CLASS;
}

function ActionOptionIcon({
  action,
  styles,
  glyphColor,
}: {
  action: ActionOptionData;
  styles: ActionsMenuStyles;
  glyphColor: string | undefined;
}): React.ReactNode {
  if (isActionConnectorGroup(action) || isActionConnectorOption(action)) {
    if ('iconType' in action && action.iconType === 'sparkles') {
      return <ActionsMenuAiIcon />;
    }
    return (
      <StepIcon stepType={getBaseConnectorType(action.connectorType)} executionStatus={undefined} />
    );
  }
  if (isActionGroup(action) || isActionOption(action)) {
    if (action.iconType === 'sparkles') {
      return <ActionsMenuAiIcon />;
    }
    return <EuiIcon type={action.iconType} size="m" color={glyphColor} aria-hidden={true} />;
  }
  return null;
}

function renderCommandOption({
  command,
  label,
  effectiveSearch,
  keyboardActiveClassName,
  styles,
  euiTheme,
}: {
  command: EditorCommand;
  label: string;
  effectiveSearch: string;
  keyboardActiveClassName: string | undefined;
  styles: ActionsMenuStyles;
  euiTheme: EuiThemeComputed;
}): React.ReactNode {
  return (
    <div css={styles.optionPad} className={keyboardActiveClassName} data-command-id={command.id}>
      <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
        <EuiFlexItem grow={false} css={[styles.tile, styles.command]}>
          <span css={styles.iconInner}>
            <EuiIcon
              type={command.iconType}
              size="m"
              color={euiTheme.colors.textParagraph}
              aria-hidden={true}
            />
          </span>
        </EuiFlexItem>
        <EuiFlexItem css={styles.optionInfo} grow>
          <EuiTitle size="xxxs">
            <h6>
              <EuiHighlight search={effectiveSearch} highlightAll>
                {label}
              </EuiHighlight>
            </h6>
          </EuiTitle>
          {command.description && (
            <EuiText size="xs" color="subdued" css={styles.optionDescription}>
              <EuiHighlight search={effectiveSearch} highlightAll>
                {command.description}
              </EuiHighlight>
            </EuiText>
          )}
        </EuiFlexItem>
        {command.shortcut && command.shortcut.length > 0 && (
          <EuiFlexItem grow={false}>
            <span css={styles.shortcutContainer}>
              {command.shortcut.map((key) => (
                <kbd key={key}>{key}</kbd>
              ))}
            </span>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </div>
  );
}

function renderJumpOption({
  entry,
  label,
  effectiveSearch,
  keyboardActiveClassName,
  styles,
}: {
  entry: JumpToStepEntry;
  label: string;
  effectiveSearch: string;
  keyboardActiveClassName: string | undefined;
  styles: ActionsMenuStyles;
}): React.ReactNode {
  return (
    <div css={styles.optionPad} className={keyboardActiveClassName} data-jump-id={entry.id}>
      <EuiText size="s">
        <EuiHighlight search={effectiveSearch} highlightAll>
          {label}
        </EuiHighlight>
      </EuiText>
    </div>
  );
}

function renderNavOption({
  label,
  keyboardActiveClassName,
  styles,
}: {
  label: string;
  keyboardActiveClassName: string | undefined;
  styles: ActionsMenuStyles;
}): React.ReactNode {
  return (
    <div css={styles.optionPad} className={keyboardActiveClassName}>
      <EuiFlexGroup
        alignItems="center"
        justifyContent="spaceBetween"
        gutterSize="xs"
        responsive={false}
      >
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="primary">
            {label}
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiIcon type="chevronSingleRight" size="s" color="primary" aria-hidden={true} />
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
}

function renderStepActionOption({
  action,
  effectiveSearch,
  keyboardActiveClassName,
  styles,
  euiTheme,
}: {
  action: ActionOptionData;
  effectiveSearch: string;
  keyboardActiveClassName: string | undefined;
  styles: ActionsMenuStyles;
  euiTheme: EuiThemeComputed;
}): React.ReactNode {
  const shouldUseGroupStyle = isActionGroup(action) || isActionConnectorGroup(action);
  const glyphColor =
    getIconGlyphColor(action.iconVariant, euiTheme) ??
    ('iconColor' in action ? action.iconColor : undefined);

  return (
    <div
      css={styles.optionPad}
      className={['actionOptionWrapper', keyboardActiveClassName].filter(Boolean).join(' ')}
      data-option-id={action.id}
    >
      <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
        <EuiFlexItem
          grow={false}
          css={[styles.tile, getActionIconTileVariantStyle(action.iconVariant, styles)]}
        >
          <span css={styles.iconInner}>
            <ActionOptionIcon action={action} styles={styles} glyphColor={glyphColor} />
          </span>
        </EuiFlexItem>
        <EuiFlexItem css={styles.optionInfo} grow>
          <EuiFlexGroup
            alignItems="center"
            justifyContent="spaceBetween"
            gutterSize="s"
            responsive={false}
          >
            <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiTitle size="xxxs">
                  <h6>
                    <EuiHighlight search={effectiveSearch} highlightAll>
                      {action.label}
                    </EuiHighlight>
                  </h6>
                </EuiTitle>
              </EuiFlexItem>
              {action.stability === 'tech_preview' && (
                <EuiFlexItem grow={false}>
                  <EuiBetaBadge
                    iconType="flask"
                    label={i18n.translate('workflows.actionsMenu.techPreviewBadge', {
                      defaultMessage: 'Tech preview',
                    })}
                    size="s"
                  />
                </EuiFlexItem>
              )}
              {action.stability === 'beta' && (
                <EuiFlexItem grow={false}>
                  <EuiBetaBadge
                    label={i18n.translate('workflows.actionsMenu.betaBadge', {
                      defaultMessage: 'Beta',
                    })}
                    size="s"
                  />
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
            {action.instancesLabel ? (
              <EuiFlexItem grow={false}>
                <EuiText color="subdued" size="xs">
                  {action.instancesLabel}
                </EuiText>
              </EuiFlexItem>
            ) : null}
          </EuiFlexGroup>
          <EuiText size="xs" color="subdued" css={styles.optionDescription}>
            <EuiHighlight search={effectiveSearch} highlightAll>
              {action.description || ''}
            </EuiHighlight>
          </EuiText>
        </EuiFlexItem>
        {shouldUseGroupStyle ? (
          <EuiFlexItem grow={false}>
            <EuiIcon type="chevronSingleRight" size="s" color="subdued" aria-hidden={true} />
          </EuiFlexItem>
        ) : null}
      </EuiFlexGroup>
    </div>
  );
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
  const effectiveSearch = getEffectiveSearch(searchTerm, searchValue);
  const keyboardActiveClassName = getKeyboardActiveClassName(
    rawOption,
    keyboardIndex,
    actionableDisplayOptions
  );

  if (itemData?.kind === 'command') {
    return renderCommandOption({
      command: itemData.command,
      label: rawOption.label,
      effectiveSearch,
      keyboardActiveClassName,
      styles,
      euiTheme,
    });
  }

  if (itemData?.kind === 'jump') {
    return renderJumpOption({
      entry: itemData.entry,
      label: rawOption.label,
      effectiveSearch,
      keyboardActiveClassName,
      styles,
    });
  }

  if (itemData?.kind === 'nav') {
    return renderNavOption({
      label: rawOption.label,
      keyboardActiveClassName,
      styles,
    });
  }

  const action =
    itemData?.kind === 'action' ? itemData.action : (rawOption as unknown as ActionOptionData);

  return renderStepActionOption({
    action,
    effectiveSearch,
    keyboardActiveClassName,
    styles,
    euiTheme,
  });
}
