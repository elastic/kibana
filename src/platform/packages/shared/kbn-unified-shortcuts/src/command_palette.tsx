/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
  type EuiSelectableOption,
  type EuiSelectableProps,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { distance } from 'fastest-levenshtein';
import useUnmount from 'react-use/lib/useUnmount';
import { consumeKeyboardEvent, isPrimaryModifierOnly } from './shortcut_utils';
import { useShortcutsContext } from './shortcuts_provider';

type CommandPaletteOption = EuiSelectableOption<{
  keywords: string[];
  shortcutLabel: string;
  run: () => void;
}>;

const COMMAND_PALETTE_TRIGGER_CODE = 'Period';
const MIN_FUZZY_TOKEN_LENGTH = 3;
const MAX_FUZZY_DISTANCE = 1;

const tokenize = (value: string) => {
  return value
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
};

const matchesToken = (candidate: string, searchToken: string) => {
  if (candidate.includes(searchToken)) {
    return true;
  }

  if (
    searchToken.length < MIN_FUZZY_TOKEN_LENGTH ||
    Math.abs(candidate.length - searchToken.length) > 1
  ) {
    return false;
  }

  return distance(candidate, searchToken) <= MAX_FUZZY_DISTANCE;
};

const optionMatcher: NonNullable<EuiSelectableProps<CommandPaletteOption>['optionMatcher']> = ({
  option,
  normalizedSearchValue,
}) => {
  const searchTokens = tokenize(normalizedSearchValue ?? '');

  if (searchTokens.length === 0) {
    return true;
  }

  const candidates = [option.label, ...(option.keywords ?? [])];
  const candidateTokens = candidates.flatMap(tokenize);

  return searchTokens.every(
    (searchToken) =>
      candidates.some((candidate) => candidate.toLowerCase().includes(searchToken)) ||
      candidateTokens.some((candidateToken) => matchesToken(candidateToken, searchToken))
  );
};

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
  const { registeredLeaderKeyGroups, releaseShortcutsLock, tryAcquireShortcutsLock } =
    useShortcutsContext();
  const [instanceId] = useState(() => Symbol('command-palette'));
  const [isVisible, setIsVisible] = useState(false);
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
  const open = useCallback(() => {
    if (options.length === 0 || isVisible) {
      return options.length > 0;
    }

    const lockAcquired = tryAcquireShortcutsLock(instanceId);

    if (lockAcquired) {
      setIsVisible(true);
    }

    return lockAcquired;
  }, [instanceId, isVisible, options.length, tryAcquireShortcutsLock]);
  const close = useCallback(() => {
    if (isVisible) {
      releaseShortcutsLock(instanceId);
      setIsVisible(false);
    }
  }, [instanceId, isVisible, releaseShortcutsLock]);
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

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isVisible) {
        if (event.key === 'Escape') {
          consumeKeyboardEvent(event);
          close();
        }

        return;
      }

      if (isPrimaryModifierOnly(event) && event.code === COMMAND_PALETTE_TRIGGER_CODE && open()) {
        consumeKeyboardEvent(event);
      }
    };

    document.addEventListener('keydown', onKeyDown, true);

    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
    };
  }, [close, isVisible, open]);

  useUnmount(() => {
    releaseShortcutsLock(instanceId);
  });

  if (!isVisible) {
    return null;
  }

  return (
    <EuiPortal>
      <EuiOverlayMask>
        <div
          css={css`
            display: flex;
            justify-content: center;
            padding: min(12vh, ${euiTheme.size.xxxl}) ${euiTheme.size.l};
          `}
        >
          <EuiOutsideClickDetector onOutsideClick={close}>
            <EuiPanel
              paddingSize="m"
              css={css`
                width: min(40rem, 100%);
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
                optionMatcher={optionMatcher}
                renderOption={renderOption}
                data-test-subj="shortcutsCommandPalette"
                listProps={{
                  isVirtualized: options.length > 20,
                  rowHeight: 40,
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
                noMatchesMessage={i18n.translate(
                  'unifiedShortcuts.commandPalette.noMatchesMessage',
                  {
                    defaultMessage: 'No commands match your search.',
                  }
                )}
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
        </div>
      </EuiOverlayMask>
    </EuiPortal>
  );
};
