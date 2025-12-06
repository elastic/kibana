/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo, useCallback, useRef, useEffect } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiText, useEuiTheme, type Query } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { UserProfile } from '@kbn/user-profile-components';
import { UserAvatar } from '@kbn/user-profile-components';
import {
  useContentListItems,
  useContentListConfig,
  useFilterDisplay,
  useContentListState,
} from '@kbn/content-list-provider';
import { useUserProfiles, NoCreatorTip } from '@kbn/content-management-user-profiles';
import {
  SelectableFilterPopover,
  StandardFilterOption,
  type SelectableFilterOption,
} from './selectable_filter_popover';

/**
 * Constant representing a user with no creator (items without a creator).
 */
export const NULL_USER = 'no-user';

/**
 * Props for the {@link CreatedByRenderer} component.
 */
export interface CreatedByRendererProps {
  /**
   * Whether to include the "No creators" option in the filter.
   *
   * @default true
   */
  showNoUserOption?: boolean;
  /**
   * Whether Kibana versioning is enabled.
   *
   * @default false
   */
  isKibanaVersioningEnabled?: boolean;
  /** Query object from `EuiSearchBar` (for `custom_component`). */
  query?: Query;
  /** `onChange` callback from `EuiSearchBar` (for `custom_component`). */
  onChange?: (query: Query) => void;
  /** Optional `data-test-subj` attribute for testing. */
  'data-test-subj'?: string;
}

/**
 * Internal interface for user option data.
 */
interface UserOptionData {
  /** The user profile data, or `null` for the "No creators" option. */
  userProfile: UserProfile | null;
  /** Whether this option represents items with no creator. */
  isNoCreator: boolean;
}

const i18nText = {
  title: i18n.translate('contentManagement.contentList.createdByRenderer.label', {
    defaultMessage: 'Created by',
  }),
  loadingMessage: i18n.translate('contentManagement.contentList.createdByRenderer.loadingMessage', {
    defaultMessage: 'Loading users...',
  }),
  noMatchesMessage: i18n.translate(
    'contentManagement.contentList.createdByRenderer.noMatchesMessage',
    { defaultMessage: 'No user matches the search' }
  ),
  errorMessage: i18n.translate('contentManagement.contentList.createdByRenderer.errorMessage', {
    defaultMessage: 'Failed to load users',
  }),
  noCreatorsLabel: i18n.translate(
    'contentManagement.contentList.createdByRenderer.noCreatorsLabel',
    { defaultMessage: 'No creators' }
  ),
  unknownUserLabel: (identifier: string) =>
    i18n.translate('contentManagement.contentList.createdByRenderer.unknownUserLabel', {
      defaultMessage: 'Unknown: {identifier}',
      values: { identifier },
    }),
};

/**
 * `CreatedByRenderer` component for `EuiSearchBar` `custom_component` filter.
 *
 * Features:
 * - User profile picker with avatars.
 * - Async user profile loading.
 * - Include/exclude support (Cmd+click to exclude).
 * - "No creators" option.
 * - User counts per option.
 *
 * @param props - The component props. See {@link CreatedByRendererProps}.
 * @returns A React element containing the created by filter, or `null` if not applicable.
 */
export const CreatedByRenderer = ({
  showNoUserOption = true,
  isKibanaVersioningEnabled = false,
  query,
  onChange,
  'data-test-subj': dataTestSubj = 'contentListCreatedByRenderer',
}: CreatedByRendererProps) => {
  const { euiTheme } = useEuiTheme();
  const config = useContentListConfig();
  const { hasUsers } = useFilterDisplay();
  const { items } = useContentListItems();
  const { createdByResolver } = useContentListState();

  // Track all user IDs ever seen across filter changes (like TableListView does with full items list).
  const allSeenUserIdsRef = useRef<Set<string>>(new Set());
  const hasEverSeenNoCreatorRef = useRef(false);

  // Accumulate user IDs from items into refs.
  // This is called both in useMemo (for immediate availability during render) and
  // in useEffect (to ensure persistence after render).
  const accumulateUserIds = useCallback(() => {
    items.forEach((item) => {
      if (item.createdBy) {
        allSeenUserIdsRef.current.add(item.createdBy);
      } else if (!item.managed) {
        hasEverSeenNoCreatorRef.current = true;
      }
    });
  }, [items]);

  // Also run after render to ensure refs are updated.
  useEffect(() => {
    accumulateUserIds();
  }, [accumulateUserIds]);

  // Get all user IDs we've ever seen.
  // We call accumulateUserIds here because useEffect runs after render,
  // but we need the IDs available immediately during render for the visibility check.
  const allUserIds = useMemo(() => {
    accumulateUserIds();
    return Array.from(allSeenUserIdsRef.current);
  }, [accumulateUserIds]);

  // Show "No creators" option if we've ever seen items without creators
  const showNoCreatorOption = showNoUserOption && hasEverSeenNoCreatorRef.current;

  // Load user profiles
  const userProfilesQuery = useUserProfiles(allUserIds, { enabled: true });

  // Use username as the filter value for display in the search bar.
  // The resolver handles deduplication between different forms (username, email, UID).
  const getFilterValue = useCallback((user: UserProfile): string => {
    return user.user.username;
  }, []);

  // Count items per user
  const userCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    items.forEach((item) => {
      const userId = item.createdBy;
      if (userId) {
        counts[userId] = (counts[userId] || 0) + 1;
      } else {
        counts[NULL_USER] = (counts[NULL_USER] || 0) + 1;
      }
    });
    return counts;
  }, [items]);

  // Build options for SelectableFilterPopover
  const options = useMemo((): Array<SelectableFilterOption<UserOptionData>> => {
    const opts: Array<SelectableFilterOption<UserOptionData>> = [];

    // Add user profile options.
    const users: UserProfile[] = userProfilesQuery.data ? [...userProfilesQuery.data] : [];

    users.forEach((user) => {
      const filterValue = getFilterValue(user);
      // Display name shows full_name or username, falling back to email or uid.
      const displayName = user.user.full_name || user.user.username || user.user.email || user.uid;

      opts.push({
        key: user.uid,
        label: displayName,
        value: filterValue, // Use username as the filter value for user-friendly display.
        count: userCounts[user.uid] ?? 0,
        data: { userProfile: user, isNoCreator: false },
      });
    });

    // Add "No creators" option if we've ever seen items without creators
    if (showNoCreatorOption) {
      opts.push({
        key: NULL_USER,
        label: i18nText.noCreatorsLabel,
        value: NULL_USER,
        count: userCounts[NULL_USER] ?? 0,
        data: { userProfile: null, isNoCreator: true },
      });
    }

    return opts;
  }, [userProfilesQuery.data, getFilterValue, userCounts, showNoCreatorOption]);

  const entityNamePlural = config.entityNamePlural || 'items';

  const emptyMessage = useMemo(() => {
    return i18n.translate('contentManagement.contentList.createdByRenderer.emptyMessage', {
      defaultMessage: 'None of the {entityNamePlural} have creators',
      values: { entityNamePlural },
    });
  }, [entityNamePlural]);

  if (!hasUsers) {
    return null;
  }

  if (allUserIds.length === 0 && !showNoCreatorOption) {
    return null;
  }

  return (
    <SelectableFilterPopover<UserOptionData>
      fieldName="createdBy"
      title={i18nText.title}
      query={query}
      onChange={onChange}
      options={options}
      resolver={createdByResolver}
      renderOption={(option, { isActive, onClick }) => {
        const { userProfile, isNoCreator } = option.data ?? {
          userProfile: null,
          isNoCreator: false,
        };

        if (isNoCreator) {
          return (
            <StandardFilterOption count={option.count ?? 0} isActive={isActive} onClick={onClick}>
              <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiText size="s">{option.label}</EuiText>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <NoCreatorTip
                    includeVersionTip={isKibanaVersioningEnabled}
                    entityNamePlural={entityNamePlural}
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            </StandardFilterOption>
          );
        }

        return (
          <StandardFilterOption count={option.count ?? 0} isActive={isActive} onClick={onClick}>
            <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
              {userProfile && (
                <EuiFlexItem grow={false}>
                  <UserAvatar user={userProfile.user} avatar={userProfile.data?.avatar} size="s" />
                </EuiFlexItem>
              )}
              <EuiFlexItem grow={false}>
                <EuiText size="s">{option.label}</EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </StandardFilterOption>
        );
      }}
      isLoading={userProfilesQuery.isLoading}
      loadingMessage={i18nText.loadingMessage}
      emptyMessage={emptyMessage}
      noMatchesMessage={i18nText.noMatchesMessage}
      errorMessage={userProfilesQuery.error ? i18nText.errorMessage : undefined}
      panelMinWidth={euiTheme.base * 22}
      data-test-subj={dataTestSubj}
    />
  );
};
