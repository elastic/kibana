/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { Fragment } from 'react';
import {
  EuiAvatar,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIconTip,
  EuiPanel,
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
  owner?: Principal;
  /** Whether the current principal is the owner. */
  isOwnerSelf?: boolean;
  entries: AccessDraftEntry[];
  entryLevels: EntryLevel[];
  /** Known user profiles, by profile UID. A missing profile is shown by its raw ID. */
  profiles: Map<string, UserProfileWithAvatar>;
  /** Entries whose recipients lack the feature privileges for their level. */
  warnings: Set<string>;
  copy: AccessCopy;
  onChangeLevel?: (entry: AccessDraftEntry, access: EntryLevel) => void;
  onRemove?: (entry: AccessDraftEntry) => void;
  onTransfer?: () => void;
  isDisabled?: boolean;
}

const REMOVE_LABEL = i18n.translate('accessControlUi.accessList.remove', {
  defaultMessage: 'Remove access',
});

export const getPrincipalKey = ({ type, id }: Principal) => `${type}:${id}`;

/**
 * Lists the owner and the named entries of an object, with controls for access managers.
 */
export const AccessList = ({
  owner,
  isOwnerSelf,
  entries,
  entryLevels,
  profiles,
  warnings,
  copy,
  onChangeLevel,
  onRemove,
  onTransfer,
  isDisabled,
}: AccessListProps) => {
  const rows = [
    ...(owner ? [{ principal: owner, isOwner: true as const }] : []),
    ...entries.map((entry) => ({ principal: entry, entry, isOwner: false as const })),
  ];
  if (rows.length === 0) {
    return null;
  }

  return (
    <EuiPanel hasBorder paddingSize="none" data-test-subj="accessPanelList">
      {rows.map((row, index) => (
        <Fragment key={getPrincipalKey(row.principal)}>
          {index > 0 ? <EuiHorizontalRule margin="none" /> : null}
          <EuiPanel
            hasShadow={false}
            paddingSize="s"
            color="transparent"
            data-test-subj={
              row.isOwner ? 'accessPanelOwner' : `accessPanelEntry-${row.principal.id}`
            }
          >
            <EuiFlexGroup gutterSize="m" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>
                <PrincipalAvatar principal={row.principal} profiles={profiles} />
              </EuiFlexItem>
              <EuiFlexItem
                css={css`
                  min-width: 0;
                `}
              >
                <PrincipalName
                  principal={row.principal}
                  profiles={profiles}
                  isSelf={row.isOwner && isOwnerSelf}
                />
              </EuiFlexItem>
              {row.isOwner ? (
                <OwnerControls onTransfer={onTransfer} isDisabled={isDisabled} />
              ) : (
                <EntryControls
                  entry={row.entry}
                  entryLevels={entryLevels}
                  copy={copy}
                  hasWarning={warnings.has(getPrincipalKey(row.entry))}
                  onChangeLevel={onChangeLevel}
                  onRemove={onRemove}
                  isDisabled={isDisabled}
                />
              )}
            </EuiFlexGroup>
          </EuiPanel>
        </Fragment>
      ))}
    </EuiPanel>
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

const OwnerControls = ({
  onTransfer,
  isDisabled,
}: {
  onTransfer?: () => void;
  isDisabled?: boolean;
}) => (
  <>
    <EuiFlexItem grow={false}>
      <EuiText size="s" color="subdued">
        {i18n.translate('accessControlUi.accessList.owner', { defaultMessage: 'Owner' })}
      </EuiText>
    </EuiFlexItem>
    {onTransfer ? (
      <EuiFlexItem grow={false}>
        <EuiButtonEmpty
          size="xs"
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
  </>
);

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
