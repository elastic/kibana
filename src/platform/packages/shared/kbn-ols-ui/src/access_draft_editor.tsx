/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo, useState } from 'react';
import { EuiSpacer } from '@elastic/eui';
import { KbnInfoCallout } from '@kbn/ui-callout';
import { i18n } from '@kbn/i18n';
import { MAX_ACL_ENTRIES, type GeneralAccess, type Principal } from '@kbn/ols';
import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
import { AccessList, getPrincipalKey } from './access_list';
import type { AccessCopy } from './copy';
import { GeneralAccessSelect } from './general_access_select';
import { PrincipalPicker } from './principal_picker';
import { ServiceAccountField } from './service_account_field';
import type { AccessDraft, AccessPolicyResponse, SuggestedUser } from './types';

// General access values from lowest to highest, used only to tell when a change lowers access.
const GENERAL_ACCESS_ORDER: readonly GeneralAccess[] = ['none', 'view', 'use', 'edit'];
const isLowered = (next: GeneralAccess, saved: GeneralAccess) =>
  GENERAL_ACCESS_ORDER.indexOf(next) < GENERAL_ACCESS_ORDER.indexOf(saved);

export interface AccessDraftEditorProps {
  policy: AccessPolicyResponse;
  value: AccessDraft;
  onChange: (value: AccessDraft) => void;
  suggestPrincipals: (name: string, signal: AbortSignal) => Promise<SuggestedUser[]>;
  copy: AccessCopy;
  /** Stored owner, excluded from named entries in edit mode. */
  owner?: Principal;
  /** Stored access, to explain what lowering general access means for people who already have access. */
  savedValue?: AccessDraft;
  profiles?: UserProfileWithAvatar[];
  /** Entries whose recipients lack feature privileges, from the last save. */
  warnings?: Principal[];
  isDisabled?: boolean;
  /**
   * Whether the editor offers a field to add a service account. Off in phase 1, where service
   * accounts get access through the APIs; their entries are still listed and can be removed.
   */
  allowServiceAccounts?: boolean;
}

/**
 * Edits general access and named entries. It is controlled: the consumer owns the draft.
 */
export const AccessDraftEditor = ({
  policy,
  value,
  onChange,
  suggestPrincipals,
  copy,
  owner,
  savedValue,
  profiles = [],
  warnings = [],
  isDisabled,
  allowServiceAccounts = false,
}: AccessDraftEditorProps) => {
  // Profiles of users picked in this session, so that new entries show names before saving.
  const [pickedUsers, setPickedUsers] = useState<SuggestedUser[]>([]);
  const newEntryLevel = policy.entry_access[0];

  const profilesByUid = useMemo(
    () => new Map([...profiles, ...pickedUsers].map((profile) => [profile.uid, profile])),
    [profiles, pickedUsers]
  );

  // A picked user who cannot use the level yet gets the same warning a save would return.
  const warningKeys = useMemo(
    () =>
      new Set([
        ...warnings.map(getPrincipalKey),
        ...pickedUsers
          .filter(({ uid, eligible_levels: eligibleLevels }) => {
            const entry = value.entries.find(({ type, id }) => type === 'user' && id === uid);
            return !!entry && !eligibleLevels.includes(entry.access);
          })
          .map(({ uid }) => getPrincipalKey({ type: 'user', id: uid })),
      ]),
    [warnings, pickedUsers, value.entries]
  );

  // Named grants stay when general access is lowered. People who had access through them keep it.
  const retainedCount =
    savedValue && isLowered(value.general.access, savedValue.general.access)
      ? value.entries.filter((entry) =>
          savedValue.entries.some((saved) => getPrincipalKey(saved) === getPrincipalKey(entry))
        ).length
      : 0;

  const excluded = [...(owner ? [owner] : []), ...value.entries];
  const isFull = value.entries.length >= MAX_ACL_ENTRIES;
  const addEntry = (principal: Principal) =>
    onChange({ ...value, entries: [...value.entries, { ...principal, access: newEntryLevel }] });

  return (
    <>
      <GeneralAccessSelect
        allowed={policy.general_access}
        value={value.general.access}
        onChange={(generalAccess) => onChange({ ...value, general: { access: generalAccess } })}
        copy={copy}
        isDisabled={isDisabled}
      />
      {retainedCount > 0 ? (
        <>
          <EuiSpacer size="s" />
          <KbnInfoCallout
            announceOnMount
            size="s"
            data-test-subj="accessPanelRetainedGrants"
            title={i18n.translate('olsUi.draftEditor.retainedGrants', {
              defaultMessage:
                '{count, plural, one {# person listed below keeps} other {# people listed below keep}} their access.',
              values: { count: retainedCount },
            })}
          />
        </>
      ) : null}
      <EuiSpacer size="m" />
      <PrincipalPicker
        suggest={suggestPrincipals}
        level={newEntryLevel}
        excluded={excluded}
        isDisabled={isDisabled || isFull}
        onSelect={(principal, user) => {
          if (user) {
            setPickedUsers((users) => [...users.filter(({ uid }) => uid !== user.uid), user]);
          }
          addEntry(principal);
        }}
      />
      <EuiSpacer size="m" />
      {allowServiceAccounts ? (
        <>
          <ServiceAccountField
            excluded={excluded}
            isDisabled={isDisabled || isFull}
            onAdd={addEntry}
          />
          <EuiSpacer size="m" />
        </>
      ) : null}
      <AccessList
        entries={value.entries}
        entryLevels={policy.entry_access}
        profiles={profilesByUid}
        warnings={warningKeys}
        copy={copy}
        isDisabled={isDisabled}
        onChangeLevel={(changed, access) =>
          onChange({
            ...value,
            entries: value.entries.map((entry) =>
              getPrincipalKey(entry) === getPrincipalKey(changed) ? { ...entry, access } : entry
            ),
          })
        }
        onRemove={(removed) =>
          onChange({
            ...value,
            entries: value.entries.filter(
              (entry) => getPrincipalKey(entry) !== getPrincipalKey(removed)
            ),
          })
        }
      />
    </>
  );
};
