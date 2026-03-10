/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo, useCallback, useEffect, useRef } from 'react';
import {
  EuiSelectable,
  EuiFlexGroup,
  EuiFlexItem,
  useEuiTheme,
  type EuiSelectableOption,
  type Query,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  useContentListItems,
  useContentListUserFilter,
  MANAGED_USER_FILTER,
  NO_CREATOR_USER_FILTER,
  type UserFilter,
} from '@kbn/content-list-provider';
import {
  useUserProfiles,
  UserAvatarTip,
  ManagedAvatarTip,
  NoCreatorTip,
} from '@kbn/content-management-user-profiles';
import { useFilterPopover, FilterPopover } from '../filter_popover';

const FIELD_NAME = 'createdBy';

const MANAGED_QUERY_VALUE = 'managed';
const NO_CREATOR_QUERY_VALUE = 'none';

const i18nText = {
  title: i18n.translate('contentManagement.contentList.createdByFilter.title', {
    defaultMessage: 'Created by',
  }),
  noCreatorLabel: i18n.translate('contentManagement.contentList.createdByFilter.noCreator', {
    defaultMessage: 'No creator',
  }),
  managedLabel: i18n.translate('contentManagement.contentList.createdByFilter.managed', {
    defaultMessage: 'Managed',
  }),
  ariaLabel: i18n.translate('contentManagement.contentList.createdByFilter.ariaLabel', {
    defaultMessage: 'Filter by creator',
  }),
};

/**
 * Props for the {@link CreatedByRenderer} component.
 *
 * When used with `EuiSearchBar` `custom_component` filters, the search bar
 * passes `query` and `onChange` props. The created-by filter uses these to
 * keep the query bar text in sync (e.g. `createdBy:(jane@elastic.co)`).
 */
export interface CreatedByRendererProps {
  /** Query object from `EuiSearchBar`. */
  query: Query;
  /** `onChange` callback from `EuiSearchBar`. */
  onChange?: (query: Query) => void;
  /** Optional `data-test-subj` attribute for testing. */
  'data-test-subj'?: string;
}

/**
 * Option item for the created-by selectable list.
 * Uses `EuiSelectableOption` with a required `key` for user/sentinel identification.
 */
type CreatedByOption = EuiSelectableOption & {
  /** The user ID, or a sentinel value for special options. */
  key: string;
};

/**
 * Extract all `createdBy` field values from an EUI `Query` object.
 */
const getCreatedByQueryValues = (query: Query): string[] => {
  try {
    const clauses = query.ast.getFieldClauses(FIELD_NAME);
    if (!clauses || clauses.length === 0) {
      return [];
    }

    const result: string[] = [];
    for (const clause of clauses) {
      const vs = Array.isArray(clause.value) ? clause.value : [clause.value];
      result.push(...vs.map(String));
    }
    return result;
  } catch {
    return [];
  }
};

/**
 * Remove all `createdBy` field clauses from a `Query` object.
 */
const removeAllCreatedByClauses = (query: Query): Query =>
  query.removeSimpleFieldClauses(FIELD_NAME).removeOrFieldClauses(FIELD_NAME);

/**
 * Build a `Query` with the given `createdBy` values added as OR-field clauses.
 */
const addCreatedByClauses = (query: Query, values: string[]): Query => {
  let updated = query;
  for (const v of values) {
    updated = updated.addOrFieldValue(FIELD_NAME, v, true, 'eq');
  }
  return updated;
};

/**
 * Check shallow equality between two {@link UserFilter} objects.
 */
const isUserFilterEqual = (a: UserFilter | undefined, b: UserFilter | undefined): boolean => {
  if (a === b) {
    return true;
  }
  if (!a || !b) {
    return false;
  }
  if (a.uid.length !== b.uid.length || !a.uid.every((v, i) => v === b.uid[i])) {
    return false;
  }
  const aKeys = Object.keys(a.query);
  const bKeys = Object.keys(b.query);
  if (aKeys.length !== bKeys.length) {
    return false;
  }
  for (const key of aKeys) {
    const av = a.query[key];
    const bv = b.query[key];
    if (!bv || av.length !== bv.length || !av.every((v, i) => v === bv[i])) {
      return false;
    }
  }
  return true;
};

/**
 * `CreatedByRenderer` component for the toolbar "Created by" filter popover.
 *
 * Renders a filterable list of unique creators extracted from the current items.
 * Each option shows a user avatar. Special entries are provided for "Managed"
 * items (created by Elastic) and items with no creator.
 *
 * Syncs the filter selection with the `EuiSearchBar` query text so the query bar
 * displays `createdBy:(email)` when a creator is selected. Email is the primary
 * display value; typing a name (e.g. `createdBy:"Jane Doe"`) also works and may
 * match multiple users.
 *
 * This component is the sole authority for deriving `filters.user` from the
 * query bar text. It classifies each `createdBy` clause as email-driven
 * (→ `user.uid`) or text-driven (→ `user.query` map) and dispatches
 * `SET_USER_FILTER` with the full {@link UserFilter} object.
 */
export const CreatedByRenderer = ({
  query,
  onChange,
  'data-test-subj': dataTestSubj = 'contentListCreatedByFilter',
}: CreatedByRendererProps) => {
  const { euiTheme } = useEuiTheme();
  const { allCreators } = useContentListItems();
  const { selectedUsers, setSelectedUsers } = useContentListUserFilter();
  const { isOpen, toggle, close } = useFilterPopover();

  // Eagerly fetch profiles so the email/UID mapping is available for query sync.
  const profilesQuery = useUserProfiles(allCreators.uids);

  // UID → query value (email primary, username fallback).
  const uidToQueryValue = useMemo(() => {
    const map = new Map<string, string>();
    map.set(MANAGED_USER_FILTER, MANAGED_QUERY_VALUE);
    map.set(NO_CREATOR_USER_FILTER, NO_CREATOR_QUERY_VALUE);

    for (const profile of profilesQuery.data ?? []) {
      map.set(profile.uid, profile.user.email ?? profile.user.username);
    }
    return map;
  }, [profilesQuery.data]);

  // Reverse map: email/sentinel string (lowercased) → UID.
  // Uses a single-value map (last-write-wins) rather than `string[]` because
  // email addresses are unique. Username collisions are theoretically possible
  // but extremely unlikely; `queryValueToUids` handles the multi-match case.
  const emailToUid = useMemo(() => {
    const map = new Map<string, string>();
    map.set(MANAGED_QUERY_VALUE, MANAGED_USER_FILTER);
    map.set(NO_CREATOR_QUERY_VALUE, NO_CREATOR_USER_FILTER);

    for (const profile of profilesQuery.data ?? []) {
      const { email, username } = profile.user;
      if (email) {
        map.set(email.toLowerCase(), profile.uid);
      }
      if (username) {
        map.set(username.toLowerCase(), profile.uid);
      }
    }
    return map;
  }, [profilesQuery.data]);

  // Query value (email, name, sentinel) → UID[]. Names may match multiple users.
  const queryValueToUids = useMemo(() => {
    const map = new Map<string, string[]>();
    map.set(MANAGED_QUERY_VALUE, [MANAGED_USER_FILTER]);
    map.set(NO_CREATOR_QUERY_VALUE, [NO_CREATOR_USER_FILTER]);

    for (const profile of profilesQuery.data ?? []) {
      const { email, full_name: name, username } = profile.user;

      for (const val of [email, name, username].filter(Boolean) as string[]) {
        const key = val.toLowerCase();
        const existing = map.get(key) ?? [];
        if (!existing.includes(profile.uid)) {
          map.set(key, [...existing, profile.uid]);
        }
      }
    }
    return map;
  }, [profilesQuery.data]);

  // Track the current `UserFilter` so the sync effect can skip no-op dispatches.
  const currentUserFilterRef = useRef<UserFilter | undefined>(undefined);

  // Sync `createdBy` clauses from the query → `filters.user`.
  // Classifies each clause as email-driven (→ `uid`) or text-driven (→ `query` map).
  useEffect(() => {
    if (!profilesQuery.data) {
      return;
    }

    const queryValues = getCreatedByQueryValues(query);

    if (queryValues.length === 0) {
      if (currentUserFilterRef.current) {
        currentUserFilterRef.current = undefined;
        setSelectedUsers(undefined);
      }
      return;
    }

    const nextUid: string[] = [];
    const nextQuery: Record<string, string[]> = {};

    for (const rawValue of queryValues) {
      const lower = rawValue.toLowerCase();
      const directUid = emailToUid.get(lower);
      if (directUid) {
        if (!nextUid.includes(directUid)) {
          nextUid.push(directUid);
        }
      } else {
        const resolved = queryValueToUids.get(lower) ?? [];
        nextQuery[rawValue] = resolved;
      }
    }

    const nextFilter: UserFilter = { uid: nextUid, query: nextQuery };

    if (!isUserFilterEqual(currentUserFilterRef.current, nextFilter)) {
      currentUserFilterRef.current = nextFilter;
      setSelectedUsers(nextFilter);
    }
  }, [query, profilesQuery.data, emailToUid, queryValueToUids, setSelectedUsers]);

  // Build selectable options from profiles and special entries.
  const options = useMemo((): CreatedByOption[] => {
    const result: CreatedByOption[] = [];

    if (allCreators.hasManaged) {
      result.push({
        key: MANAGED_USER_FILTER,
        label: i18nText.managedLabel,
        prepend: <ManagedAvatarTip />,
        checked: selectedUsers.includes(MANAGED_USER_FILTER) ? 'on' : undefined,
      });
    }

    if (profilesQuery.data) {
      for (const profile of profilesQuery.data) {
        const { uid } = profile;
        result.push({
          key: uid,
          label: profile.user.full_name ?? profile.user.username,
          prepend: <UserAvatarTip uid={uid} />,
          checked: selectedUsers.includes(uid) ? 'on' : undefined,
        });
      }
    } else {
      for (const uid of allCreators.uids) {
        result.push({
          key: uid,
          label: uid,
          checked: selectedUsers.includes(uid) ? 'on' : undefined,
        });
      }
    }

    if (allCreators.hasNoCreator) {
      result.push({
        key: NO_CREATOR_USER_FILTER,
        label: i18nText.noCreatorLabel,
        prepend: <NoCreatorTip />,
        checked: selectedUsers.includes(NO_CREATOR_USER_FILTER) ? 'on' : undefined,
      });
    }

    return result;
  }, [allCreators, profilesQuery.data, selectedUsers]);

  const handleSelectChange = useCallback(
    (updatedOptions: EuiSelectableOption[]) => {
      const selectedUids = updatedOptions
        .filter((opt) => opt.checked === 'on')
        .map((opt) => opt.key ?? '')
        .filter(Boolean);

      // Preserve text-driven queries from the current filter.
      const currentQuery = currentUserFilterRef.current?.query ?? {};

      // Optimistically dispatch the new UserFilter to avoid popover flicker.
      const optimisticFilter: UserFilter = { uid: selectedUids, query: currentQuery };
      currentUserFilterRef.current = optimisticFilter;
      setSelectedUsers(optimisticFilter);

      // Update the query bar text: preserve sticky text values, add email values for new UIDs.
      if (onChange) {
        const cleaned = removeAllCreatedByClauses(query);
        const textValues = Object.keys(currentQuery);
        const emailValues = selectedUids
          .map((uid) => uidToQueryValue.get(uid))
          .filter(Boolean) as string[];
        const updated = addCreatedByClauses(cleaned, [...textValues, ...emailValues]);
        onChange(updated);
      }
    },
    [setSelectedUsers, onChange, query, uidToQueryValue]
  );

  return (
    <FilterPopover
      title={i18nText.title}
      activeCount={selectedUsers.length}
      isOpen={isOpen}
      onToggle={toggle}
      onClose={close}
      panelWidth={euiTheme.base * 20}
      data-test-subj={dataTestSubj}
    >
      <EuiSelectable
        aria-label={i18nText.ariaLabel}
        options={options}
        onChange={handleSelectChange}
        data-test-subj="createdBySelectOptions"
        listProps={{ bordered: false }}
      >
        {(list) => (
          <EuiFlexGroup direction="column" gutterSize="none">
            <EuiFlexItem grow={false}>{list}</EuiFlexItem>
          </EuiFlexGroup>
        )}
      </EuiSelectable>
    </FilterPopover>
  );
};
