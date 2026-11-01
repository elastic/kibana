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
  EuiAvatar,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiIconTip,
  EuiSelect,
  EuiText,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { EntryLevel, Principal } from '@kbn/access-control';
import {
  getUserDisplayName,
  UserAvatar,
  type UserProfileWithAvatar,
} from '@kbn/user-profile-components';
import { getEntryLevelCopy, type AccessCopy } from './copy';
import type { AccessDraftEntry } from './types';

export interface AccessListProps {
  entries: AccessDraftEntry[];
  entryLevels: EntryLevel[];
  /** Known user profiles, by profile UID. A missing profile is shown by its raw ID. */
  profiles: Map<string, UserProfileWithAvatar>;
  /** Entries whose recipients lack the feature privileges for their level. */
  warnings: Set<string>;
  copy: AccessCopy;
  onChangeLevel?: (entry: AccessDraftEntry, access: EntryLevel) => void;
  onRemove?: (entry: AccessDraftEntry) => void;
  isDisabled?: boolean;
}

const REMOVE_LABEL = i18n.translate('accessControlUi.accessList.remove', {
  defaultMessage: 'Remove access',
});

export const getPrincipalKey = ({ type, id }: Principal) => `${type}:${id}`;

/**
 * Shows a person or a service account, with optional controls on the right.
 */
export const PrincipalRow = ({
  principal,
  profiles,
  isSelf,
  children,
  'data-test-subj': dataTestSubj,
}: {
  principal: Principal;
  profiles: Map<string, UserProfileWithAvatar>;
  isSelf?: boolean;
  children?: React.ReactNode;
  'data-test-subj'?: string;
}) => (
  <EuiFlexGroup gutterSize="m" alignItems="center" responsive={false} data-test-subj={dataTestSubj}>
    <EuiFlexItem grow={false}>
      <PrincipalAvatar principal={principal} profiles={profiles} />
    </EuiFlexItem>
    <EuiFlexItem
      css={css`
        min-width: 0;
      `}
    >
      <PrincipalName principal={principal} profiles={profiles} isSelf={isSelf} />
    </EuiFlexItem>
    {children}
  </EuiFlexGroup>
);

/**
 * Shows the owner of an object, with the transfer action for people who can transfer ownership.
 */
export const OwnerRow = ({
  owner,
  isOwnerSelf,
  profiles,
  onTransfer,
  isDisabled,
  label = i18n.translate('accessControlUi.accessList.owner', { defaultMessage: 'Owner' }),
}: {
  owner: Principal;
  isOwnerSelf?: boolean;
  profiles: Map<string, UserProfileWithAvatar>;
  onTransfer?: () => void;
  isDisabled?: boolean;
  label?: string;
}) => (
  <EuiFormRow fullWidth label={label}>
    <PrincipalRow
      principal={owner}
      profiles={profiles}
      isSelf={isOwnerSelf}
      data-test-subj="accessPanelOwner"
    >
      {onTransfer ? (
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            size="s"
            iconType="merge"
            onClick={onTransfer}
            isDisabled={isDisabled}
            data-test-subj="accessPanelTransfer"
          >
            {i18n.translate('accessControlUi.accessList.transfer', {
              defaultMessage: 'Transfer ownership',
            })}
          </EuiButtonEmpty>
        </EuiFlexItem>
      ) : null}
    </PrincipalRow>
  </EuiFormRow>
);

/**
 * Lists the named entries of an object, with controls for access managers.
 */
export const AccessList = ({
  entries,
  entryLevels,
  profiles,
  warnings,
  copy,
  onChangeLevel,
  onRemove,
  isDisabled,
}: AccessListProps) => {
  const { euiTheme } = useEuiTheme();
  if (entries.length === 0) {
    return null;
  }

  return (
    <EuiFormRow
      fullWidth
      label={i18n.translate('accessControlUi.accessList.title', {
        defaultMessage: 'Who has access',
      })}
    >
      <ul
        data-test-subj="accessPanelList"
        css={css`
          & > li {
            padding-block: ${euiTheme.size.s};
          }
          & > li + li {
            border-top: ${euiTheme.border.thin};
          }
        `}
      >
        {entries.map((entry) => (
          <li key={getPrincipalKey(entry)}>
            <PrincipalRow
              principal={entry}
              profiles={profiles}
              data-test-subj={`accessPanelEntry-${entry.id}`}
            >
              <EntryControls
                entry={entry}
                entryLevels={entryLevels}
                copy={copy}
                hasWarning={warnings.has(getPrincipalKey(entry))}
                onChangeLevel={onChangeLevel}
                onRemove={onRemove}
                isDisabled={isDisabled}
              />
            </PrincipalRow>
          </li>
        ))}
      </ul>
    </EuiFormRow>
  );
};

const PrincipalAvatar = ({
  principal,
  profiles,
}: {
  principal: Principal;
  profiles: Map<string, UserProfileWithAvatar>;
}) => {
  const profile = principal.type === 'user' ? profiles.get(principal.id) : undefined;
  if (profile) {
    return <UserAvatar user={profile.user} avatar={profile.data.avatar} size="s" />;
  }

  return (
    <EuiAvatar
      size="s"
      name={principal.id}
      iconType={principal.type === 'service_account' ? 'gear' : 'user'}
      color="subdued"
    />
  );
};

const PrincipalName = ({
  principal,
  profiles,
  isSelf,
}: {
  principal: Principal;
  profiles: Map<string, UserProfileWithAvatar>;
  isSelf?: boolean;
}) => {
  const { euiTheme } = useEuiTheme();
  const profile = principal.type === 'user' ? profiles.get(principal.id) : undefined;
  const truncate = css`
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  `;

  let name: string;
  let details: string;
  if (profile) {
    name = getUserDisplayName(profile.user);
    details = profile.user.email || profile.user.username;
  } else if (principal.type === 'service_account') {
    name = principal.id;
    details = i18n.translate('accessControlUi.accessList.serviceAccount', {
      defaultMessage: 'Service account',
    });
  } else {
    // The profile was deleted or never activated. The entry stays visible so it can be removed.
    name = principal.id;
    details = i18n.translate('accessControlUi.accessList.unknownUser', {
      defaultMessage: 'Unknown or deleted user',
    });
  }

  return (
    <>
      <EuiText size="s" css={truncate}>
        <strong>{name}</strong>
        {isSelf ? (
          <span
            css={css`
              color: ${euiTheme.colors.textSubdued};
            `}
          >
            {i18n.translate('accessControlUi.accessList.you', { defaultMessage: ' (you)' })}
          </span>
        ) : null}
      </EuiText>
      <EuiText size="xs" color="subdued" css={truncate}>
        {details}
      </EuiText>
    </>
  );
};

const EntryControls = ({
  entry,
  entryLevels,
  copy,
  hasWarning,
  onChangeLevel,
  onRemove,
  isDisabled,
}: {
  entry: AccessDraftEntry;
  entryLevels: EntryLevel[];
  copy: AccessCopy;
  hasWarning: boolean;
  onChangeLevel?: AccessListProps['onChangeLevel'];
  onRemove?: AccessListProps['onRemove'];
  isDisabled?: boolean;
}) => (
  <>
    {hasWarning ? (
      <EuiFlexItem grow={false}>
        <EuiIconTip
          type="warning"
          color="warning"
          content={i18n.translate('accessControlUi.accessList.missingPrivileges', {
            defaultMessage:
              "This person's role doesn't allow everything this level grants. The grant applies as soon as their role does.",
          })}
          iconProps={{ 'data-test-subj': `accessPanelEntryWarning-${entry.id}` }}
        />
      </EuiFlexItem>
    ) : null}
    <EuiFlexItem grow={false}>
      {entryLevels.length > 1 && onChangeLevel ? (
        <EuiSelect
          compressed
          options={entryLevels.map((level) => ({
            value: level,
            text: getEntryLevelCopy(copy, level).label,
          }))}
          value={entry.access}
          onChange={(event) => onChangeLevel(entry, event.target.value as EntryLevel)}
          disabled={isDisabled}
          aria-label={i18n.translate('accessControlUi.accessList.levelLabel', {
            defaultMessage: 'Access level for {name}',
            values: { name: entry.id },
          })}
          data-test-subj={`accessPanelEntryLevel-${entry.id}`}
        />
      ) : (
        <EuiText size="s" data-test-subj={`accessPanelEntryLevel-${entry.id}`}>
          {getEntryLevelCopy(copy, entry.access).label}
        </EuiText>
      )}
    </EuiFlexItem>
    {onRemove ? (
      <EuiFlexItem grow={false}>
        <EuiToolTip content={REMOVE_LABEL} disableScreenReaderOutput>
          <EuiButtonIcon
            iconType="cross"
            color="text"
            onClick={() => onRemove(entry)}
            isDisabled={isDisabled}
            aria-label={REMOVE_LABEL}
            data-test-subj={`accessPanelEntryRemove-${entry.id}`}
          />
        </EuiToolTip>
      </EuiFlexItem>
    ) : null}
  </>
);
