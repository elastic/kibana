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
  EuiSuperSelect,
  EuiIcon,
  EuiSpacer,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
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
const peopleLabel = i18n.translate('entityAccessControl.peopleLabel', {
  defaultMessage: 'People with access',
});
const searchLabel = i18n.translate('entityAccessControl.searchPlaceholder', {
  defaultMessage: 'Find users',
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
  const entries = value.entries ?? [];
  const showEntries = value.access_mode === 'private' || allowPublicEntries;
  const profileById = new Map(
    [...profiles, ...suggestedProfiles].map((profile) => [profile.uid, profile])
  );
  const excludedIds = new Set([ownerId, currentUserId, ...entries.map(({ id }) => id)]);
  const options = suggestedProfiles
    .filter(({ uid }) => !excludedIds.has(uid))
    .map((profile) => ({ value: profile.uid, label: getUserDisplayName(profile.user) }));
  const owner = ownerId ? profileById.get(ownerId) : undefined;

  const renderUser = (id: string) => {
    const profile = profileById.get(id);
    return (
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        {profile && (
          <EuiFlexItem grow={false}>
            <UserAvatar user={profile.user} avatar={profile.data?.avatar} size="s" />
          </EuiFlexItem>
        )}
        <EuiFlexItem>
          <EuiText size="s">{profile ? getUserDisplayName(profile.user) : id}</EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  };

  const privateDescription = i18n.translate('entityAccessControl.privateDescription', {
    defaultMessage: 'Only the owner and the selected users have access.',
  });
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
        <EuiText size="s">
          <strong>{label}</strong>
        </EuiText>
        <EuiText size="xs" color="subdued">
          {description}
        </EuiText>
      </>
    ),
  }));

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
        <EuiFormRow label={peopleLabel} fullWidth>
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
      <EuiSpacer size="m" />
      {ownerId && (
        <>
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
          <EuiSpacer size="s" />
        </>
      )}
      {showEntries &&
        entries.map((entry) => (
          <React.Fragment key={entry.id}>
            <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
              <EuiFlexItem>{renderUser(entry.id)}</EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiSuperSelect<Role>
                  aria-label={i18n.translate('entityAccessControl.roleAriaLabel', {
                    defaultMessage: 'Role for {name}',
                    values: { name: profileById.get(entry.id)?.user.username ?? entry.id },
                  })}
                  options={roles.map(({ value: role, text }) => ({
                    value: role,
                    inputDisplay: text,
                  }))}
                  valueOfSelected={entry.role}
                  data-test-subj={`entityAccessControlRole-${
                    profileById.get(entry.id)?.user.username ?? entry.id
                  }`}
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
                <EuiToolTip
                  content={getRemoveLabel(profileById.get(entry.id)?.user.username ?? entry.id)}
                  disableScreenReaderOutput
                >
                  <EuiButtonIcon
                    iconType="cross"
                    aria-label={getRemoveLabel(
                      profileById.get(entry.id)?.user.username ?? entry.id
                    )}
                    isDisabled={isDisabled}
                    onClick={() =>
                      onChange({ ...value, entries: entries.filter(({ id }) => id !== entry.id) })
                    }
                  />
                </EuiToolTip>
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer size="s" />
          </React.Fragment>
        ))}
    </>
  );
};
