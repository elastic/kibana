/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import {
  EuiButtonIcon,
  EuiComboBox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiIcon,
  EuiPanel,
  EuiSpacer,
  EuiSuperSelect,
  EuiText,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { ACCESS_CONTROL_MAX_ENTRIES } from '@kbn/entity-access-control';
import type { AccessControlInput, AccessControlMode } from '@kbn/entity-access-control';
import { i18n } from '@kbn/i18n';
import {
  getUserDisplayName,
  UserAvatar,
  type UserProfileWithAvatar,
} from '@kbn/user-profile-components';

export interface AccessControlRoleOption<Role extends string> {
  value: Role;
  text: string;
}

export interface AccessControlFormProps<Role extends string> {
  value: AccessControlInput<Role>;
  onChange: (value: AccessControlInput<Role>) => void;
  ownerId?: string;
  currentUserId?: string;
  profiles: UserProfileWithAvatar[];
  suggestedProfiles: UserProfileWithAvatar[];
  onSearch: (name: string) => void;
  roles: readonly [AccessControlRoleOption<Role>, ...Array<AccessControlRoleOption<Role>>];
  publicDescription: string;
  allowPublicEntries?: boolean;
  isDisabled?: boolean;
  isSearching?: boolean;
}

const visibilityLabel = i18n.translate('entityAccessControl.visibilityLabel', {
  defaultMessage: 'Visibility',
});
const usersLabel = i18n.translate('entityAccessControl.usersLabel', {
  defaultMessage: 'Users with access',
});
const searchLabel = i18n.translate('entityAccessControl.searchPlaceholder', {
  defaultMessage: 'Find users',
});
const privateDescription = i18n.translate('entityAccessControl.privateDescription', {
  defaultMessage: 'Only the owner and the selected users have access.',
});

const getRemoveLabel = (name: string): string =>
  i18n.translate('entityAccessControl.removeAriaLabel', {
    defaultMessage: 'Remove {name}',
    values: { name },
  });

/** Edits profile-based sharing with visibility, user search, and consumer-defined roles. */
export const AccessControlForm = <Role extends string>({
  value,
  onChange,
  ownerId,
  currentUserId,
  profiles,
  suggestedProfiles,
  onSearch,
  roles,
  publicDescription,
  allowPublicEntries = true,
  isDisabled = false,
  isSearching = false,
}: AccessControlFormProps<Role>): React.ReactElement => {
  const { euiTheme } = useEuiTheme();
  const userListCss = css({
    display: 'grid',
    gridAutoRows: '1fr',
  });
  const userRowCss = css({
    display: 'flex',
    alignItems: 'center',
    boxSizing: 'border-box',
    paddingBlock: euiTheme.size.s,
    paddingInline: euiTheme.size.m,
    // One-line owner rows are shorter than rows that include a role control.
    minBlockSize: `calc(${euiTheme.size.xxl} + ${euiTheme.size.s} * 2)`,
    '& > *': {
      flexGrow: 1,
    },
    '&:not(:last-child)': {
      borderBlockEnd: euiTheme.border.thin,
    },
  });
  const entries = value.entries ?? [];
  const showEntries = value.access_mode === 'private' || allowPublicEntries;
  const profileById = new Map(
    [...profiles, ...suggestedProfiles].map((profile) => [profile.uid, profile])
  );
  const excludedIds = new Set([ownerId, currentUserId, ...entries.map(({ id }) => id)]);
  const options = suggestedProfiles
    .filter(({ uid }) => !excludedIds.has(uid))
    .map(({ uid, user }) => {
      const displayName = getUserDisplayName(user);
      return {
        value: uid,
        label: displayName === user.username ? displayName : `${displayName} (${user.username})`,
      };
    });
  const owner = ownerId ? profileById.get(ownerId) : undefined;

  const renderUser = (id: string) => {
    const profile = profileById.get(id);
    const displayName = profile ? getUserDisplayName(profile.user) : id;
    return (
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        {profile && (
          <EuiFlexItem grow={false}>
            <UserAvatar user={profile.user} avatar={profile.data?.avatar} size="s" />
          </EuiFlexItem>
        )}
        <EuiFlexItem>
          <EuiText size="s">{displayName}</EuiText>
          {profile && profile.user.username !== displayName && (
            <EuiText size="xs" color="subdued">
              {profile.user.username}
            </EuiText>
          )}
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  };

  const visibilityOptions = [
    {
      value: 'public' as const,
      icon: 'globe' as const,
      label: i18n.translate('entityAccessControl.publicDropDownOptionLabel', {
        defaultMessage: 'Public',
      }),
      description: publicDescription,
    },
    {
      value: 'private' as const,
      icon: 'lock' as const,
      label: i18n.translate('entityAccessControl.privateDropDownOptionLabel', {
        defaultMessage: 'Private',
      }),
      description: privateDescription,
    },
  ].map(({ value: mode, icon, label, description }) => ({
    value: mode,
    inputDisplay: (
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiIcon type={icon} aria-hidden={true} />
        </EuiFlexItem>
        <EuiFlexItem>{label}</EuiFlexItem>
      </EuiFlexGroup>
    ),
    dropdownDisplay: (
      <>
        <EuiText size="s" color="default">
          <strong>{label}</strong>
        </EuiText>
        <EuiText size="xs" color="subdued">
          {description}
        </EuiText>
      </>
    ),
  }));

  const userRows: Array<{ key: string; content: React.ReactNode }> = [];
  if (ownerId) {
    userRows.push({
      key: 'owner',
      content: (
        <EuiFlexGroup alignItems="center" responsive={false}>
          <EuiFlexItem>{renderUser(owner?.uid ?? ownerId)}</EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="s">
              {ownerId === currentUserId
                ? i18n.translate('entityAccessControl.currentOwnerLabel', {
                    defaultMessage: 'Owner (you)',
                  })
                : i18n.translate('entityAccessControl.ownerLabel', { defaultMessage: 'Owner' })}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      ),
    });
  }
  if (showEntries) {
    entries.forEach((entry) => {
      const name = profileById.get(entry.id)?.user.username ?? entry.id;
      userRows.push({
        key: entry.id,
        content: (
          <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
            <EuiFlexItem>{renderUser(entry.id)}</EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiSuperSelect<Role>
                aria-label={i18n.translate('entityAccessControl.roleAriaLabel', {
                  defaultMessage: 'Role for {name}',
                  values: { name },
                })}
                options={roles.map(({ value: role, text }) => ({
                  value: role,
                  inputDisplay: text,
                }))}
                valueOfSelected={entry.role}
                data-test-subj={`entityAccessControlRole-${name}`}
                disabled={isDisabled}
                onChange={(role) =>
                  onChange({
                    ...value,
                    entries: entries.map((current) =>
                      current.id === entry.id ? { ...current, role } : current
                    ),
                  })
                }
                compressed
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiToolTip content={getRemoveLabel(name)} disableScreenReaderOutput>
                <EuiButtonIcon
                  iconType="cross"
                  color="danger"
                  aria-label={getRemoveLabel(name)}
                  isDisabled={isDisabled}
                  onClick={() =>
                    onChange({ ...value, entries: entries.filter(({ id }) => id !== entry.id) })
                  }
                />
              </EuiToolTip>
            </EuiFlexItem>
          </EuiFlexGroup>
        ),
      });
    });
  }

  return (
    <>
      <EuiFormRow
        label={visibilityLabel}
        fullWidth
        helpText={value.access_mode === 'public' ? publicDescription : privateDescription}
      >
        <EuiSuperSelect<AccessControlMode>
          aria-label={visibilityLabel}
          valueOfSelected={value.access_mode}
          options={visibilityOptions}
          onChange={(accessMode) => onChange({ ...value, access_mode: accessMode })}
          disabled={isDisabled}
          fullWidth
          data-test-subj="entityAccessControlMode"
        />
      </EuiFormRow>
      <EuiSpacer size="m" />
      {showEntries && (
        <EuiFormRow label={usersLabel} fullWidth>
          <EuiComboBox<string>
            aria-label={searchLabel}
            placeholder={searchLabel}
            options={options}
            selectedOptions={[]}
            onSearchChange={onSearch}
            onChange={(selected) => {
              const id = selected[0]?.value;
              if (id && !excludedIds.has(id) && entries.length < ACCESS_CONTROL_MAX_ENTRIES) {
                onChange({
                  ...value,
                  entries: [...entries, { type: 'user', id, role: roles[0].value }],
                });
              }
            }}
            renderOption={({ value: id }) => (id ? renderUser(id) : null)}
            rowHeight="auto"
            singleSelection={{ asPlainText: true }}
            isDisabled={isDisabled || entries.length >= ACCESS_CONTROL_MAX_ENTRIES}
            isLoading={isSearching}
            isClearable={false}
            async
            fullWidth
            data-test-subj="entityAccessControlUserSearch"
          />
        </EuiFormRow>
      )}
      {userRows.length > 0 && (
        <>
          <EuiSpacer size="m" />
          <EuiPanel
            hasBorder
            hasShadow={false}
            paddingSize="none"
            color="transparent"
            borderRadius="m"
            data-test-subj="entityAccessControlUserList"
          >
            <div css={userListCss}>
              {userRows.map((row) => (
                <div key={row.key} css={userRowCss}>
                  {row.content}
                </div>
              ))}
            </div>
          </EuiPanel>
        </>
      )}
    </>
  );
};
