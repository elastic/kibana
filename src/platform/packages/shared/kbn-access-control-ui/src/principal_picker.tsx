/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  EuiBadge,
  EuiComboBox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiText,
  type EuiComboBoxOptionOption,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { EntryLevel, Principal } from '@kbn/access-control';
import { getUserDisplayName, UserAvatar } from '@kbn/user-profile-components';
import type { SuggestedUser } from './types';

/**
 * Service account IDs have the `namespace/service` form, for example `kibana/nightshift`.
 */
const SERVICE_ACCOUNT_ID_PATTERN = /^[^/\s]+\/[^/\s]+$/;
const SEARCH_DEBOUNCE_MS = 250;

export interface PrincipalPickerProps {
  /** Returns users matching a search. */
  suggest: (name: string, signal: AbortSignal) => Promise<SuggestedUser[]>;
  onSelect: (principal: Principal, user?: SuggestedUser) => void;
  /** Principals that cannot be picked, such as the owner and existing entries. */
  excluded: Principal[];
  /** Level a new entry gets. Users who cannot use it get a warning badge. */
  level?: EntryLevel;
  label?: string;
  helpText?: string;
  isDisabled?: boolean;
  /** Whether a typed service account ID can be picked. */
  allowServiceAccounts?: boolean;
  'data-test-subj'?: string;
}

export const PrincipalPicker = ({
  suggest,
  onSelect,
  excluded,
  level,
  label,
  helpText,
  isDisabled,
  allowServiceAccounts = true,
  'data-test-subj': dataTestSubj = 'accessPanelPrincipalPicker',
}: PrincipalPickerProps) => {
  const [searchValue, setSearchValue] = useState('');
  const [users, setUsers] = useState<SuggestedUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const abortController = useRef<AbortController>();

  useEffect(() => {
    abortController.current?.abort();
    const controller = new AbortController();
    abortController.current = controller;

    const timeout = setTimeout(async () => {
      setIsLoading(true);
      try {
        const suggested = await suggest(searchValue, controller.signal);
        if (!controller.signal.aborted) {
          setUsers(suggested);
        }
      } catch {
        // Suggestions are a convenience: a failed search leaves the list empty, and a typed service
        // account ID still works.
        if (!controller.signal.aborted) {
          setUsers([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [searchValue, suggest]);

  const isExcluded = useCallback(
    (principal: Principal) =>
      excluded.some(({ type, id }) => type === principal.type && id === principal.id),
    [excluded]
  );

  const options: Array<EuiComboBoxOptionOption<SuggestedUser>> = users
    .filter(({ uid }) => !isExcluded({ type: 'user', id: uid }))
    .map((user) => ({ key: user.uid, label: getUserDisplayName(user.user), value: user }));

  const renderOption = ({ value: user }: EuiComboBoxOptionOption<SuggestedUser>) =>
    user ? (
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <UserAvatar user={user.user} avatar={user.data.avatar} size="s" />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText size="s">{getUserDisplayName(user.user)}</EuiText>
          {user.user.email && user.user.email !== getUserDisplayName(user.user) ? (
            <EuiText size="xs" color="subdued">
              {user.user.email}
            </EuiText>
          ) : null}
        </EuiFlexItem>
        {level && !user.eligible_levels.includes(level) ? (
          <EuiFlexItem grow={false}>
            <EuiBadge color="warning" iconType="warning">
              {i18n.translate('accessControlUi.principalPicker.missingPrivileges', {
                defaultMessage: 'Missing privileges',
              })}
            </EuiBadge>
          </EuiFlexItem>
        ) : null}
      </EuiFlexGroup>
    ) : null;

  const onCreateServiceAccount = (value: string) => {
    const id = value.trim();
    if (!SERVICE_ACCOUNT_ID_PATTERN.test(id) || isExcluded({ type: 'service_account', id })) {
      return false;
    }
    onSelect({ type: 'service_account', id });
    setSearchValue('');
  };

  return (
    <EuiFormRow
      fullWidth
      label={
        label ??
        i18n.translate('accessControlUi.principalPicker.label', { defaultMessage: 'Add people' })
      }
      helpText={
        helpText ??
        i18n.translate('accessControlUi.principalPicker.helpText', {
          defaultMessage:
            'Users appear after their first sign-in. To add a service account, type its ID, such as kibana/my-service.',
        })
      }
    >
      <EuiComboBox<SuggestedUser>
        async
        fullWidth
        isLoading={isLoading}
        isDisabled={isDisabled}
        options={options}
        selectedOptions={[]}
        onSearchChange={setSearchValue}
        onChange={([selected]) => {
          if (selected?.value) {
            onSelect({ type: 'user', id: selected.value.uid }, selected.value);
            setSearchValue('');
          }
        }}
        onCreateOption={allowServiceAccounts ? onCreateServiceAccount : undefined}
        customOptionText={i18n.translate('accessControlUi.principalPicker.addServiceAccount', {
          defaultMessage: 'Add service account {searchValue}',
          values: { searchValue: '{searchValue}' },
        })}
        renderOption={renderOption}
        rowHeight={48}
        placeholder={i18n.translate('accessControlUi.principalPicker.placeholder', {
          defaultMessage: 'Search by name, username, or email',
        })}
        data-test-subj={dataTestSubj}
      />
    </EuiFormRow>
  );
};
