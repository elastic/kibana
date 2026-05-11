/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useMemo } from 'react';
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiOutsideClickDetector,
  EuiOverlayMask,
  EuiPanel,
  EuiPortal,
  EuiSelectable,
  EuiSpacer,
  EuiText,
  type EuiSelectableProps,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import {
  commandPaletteOptionMatcher,
  type CommandPaletteOption,
} from './command_palette_fuzzy_search';
import { isPrimaryModifierOnly } from './shortcut_utils';
import { useShortcutsContext } from './shortcuts_provider';
import { useShortcutsLayer } from './use_shortcuts_layer';

const COMMAND_PALETTE_TRIGGER_CODE = 'Period';

const renderOption: NonNullable<EuiSelectableProps<CommandPaletteOption>['renderOption']> = (
  option
) => {
  return (
    <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false} wrap={false}>
      <EuiFlexItem>
        <EuiText size="s">{option.label}</EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiBadge color="hollow">{option.shortcutLabel}</EuiBadge>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

export const CommandPalette = () => {
  const { euiTheme } = useEuiTheme();
  const { registeredLeaderKeyGroups } = useShortcutsContext();
  const options = useMemo<CommandPaletteOption[]>(() => {
    return registeredLeaderKeyGroups
      .toSorted((left, right) =>
        left.leaderKeyDescription.localeCompare(right.leaderKeyDescription)
      )
      .flatMap(({ leaderKey, leaderKeyDescription, shortcuts }) => {
        return shortcuts.map(({ key, label, description, onTrigger }) => ({
          key: `${leaderKey}:${key}:${description}`,
          label: `${leaderKeyDescription} > ${description}`,
          shortcutLabel: label,
          keywords: [leaderKey, leaderKeyDescription, key, label, description],
          run: onTrigger,
        }));
      });
  }, [registeredLeaderKeyGroups]);
  const shouldOpen = useCallback(
    (event: KeyboardEvent) => {
      return (
        options.length > 0 &&
        isPrimaryModifierOnly(event) &&
        event.code === COMMAND_PALETTE_TRIGGER_CODE
      );
    },
    [options.length]
  );
  const { isVisible, close } = useShortcutsLayer({
    instanceIdLabel: 'command-palette',
    shouldOpen,
  });
  const onChange = useCallback<NonNullable<EuiSelectableProps<CommandPaletteOption>['onChange']>>(
    (newOptions) => {
      const selectedCommand = newOptions.find(({ checked }) => checked === 'on');

      if (selectedCommand) {
        close();
        selectedCommand.run();
      }
    },
    [close]
  );

  if (!isVisible) {
    return null;
  }

  return (
    <EuiPortal>
      <EuiOverlayMask
        css={css`
          padding: ${euiTheme.size.l};
        `}
      >
        <EuiOutsideClickDetector onOutsideClick={close}>
          <EuiPanel
            paddingSize="m"
            css={css`
              max-width: 56rem;
            `}
          >
            <EuiSelectable<CommandPaletteOption>
              aria-label={i18n.translate('unifiedShortcuts.commandPalette.ariaLabel', {
                defaultMessage: 'Command palette',
              })}
              searchable
              singleSelection={true}
              height={320}
              options={options}
              onChange={onChange}
              optionMatcher={commandPaletteOptionMatcher}
              renderOption={renderOption}
              data-test-subj="shortcutsCommandPalette"
              listProps={{
                isVirtualized: options.length > 20,
                rowHeight: 30,
                onFocusBadge: false,
                showIcons: false,
              }}
              searchProps={{
                autoFocus: true,
                placeholder: i18n.translate('unifiedShortcuts.commandPalette.searchPlaceholder', {
                  defaultMessage: 'Search commands',
                }),
                'data-test-subj': 'shortcutsCommandPaletteSearch',
              }}
              emptyMessage={i18n.translate('unifiedShortcuts.commandPalette.emptyMessage', {
                defaultMessage: 'No commands available.',
              })}
              noMatchesMessage={i18n.translate('unifiedShortcuts.commandPalette.noMatchesMessage', {
                defaultMessage: 'No commands match your search.',
              })}
            >
              {(list, search) => (
                <>
                  {search}
                  <EuiSpacer size="s" />
                  {list}
                </>
              )}
            </EuiSelectable>
          </EuiPanel>
        </EuiOutsideClickDetector>
      </EuiOverlayMask>
    </EuiPortal>
  );
};
