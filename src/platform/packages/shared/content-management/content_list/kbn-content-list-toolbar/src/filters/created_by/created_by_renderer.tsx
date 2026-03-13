/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo, useCallback } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiText, useEuiTheme, type Query } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  MANAGED_USER_FILTER,
  NO_CREATOR_USER_FILTER,
  useContentListItems,
  CREATED_BY_FILTER_ID,
} from '@kbn/content-list-provider';
import {
  UserAvatarTip,
  ManagedAvatarTip,
  NoCreatorTip,
} from '@kbn/content-management-user-profiles';
import {
  SelectableFilterPopover,
  StandardFilterOption,
  type SelectableFilterOption,
} from '../selectable_filter_popover';
import { useCreatorProfiles } from './use_creator_profiles';
import { useCreatedByQueryResolver } from './use_created_by_query_resolver';
import { MANAGED_QUERY_VALUE, NO_CREATOR_QUERY_VALUE } from './constants';

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
  loadingLabel: i18n.translate('contentManagement.contentList.createdByFilter.loading', {
    defaultMessage: 'Loading…',
  }),
};

/**
 * Props for the {@link CreatedByRenderer} component.
 */
export interface CreatedByRendererProps {
  /** Query object from `EuiSearchBar`. */
  query: Query;
  /** `onChange` callback from `EuiSearchBar`. */
  onChange?: (query: Query) => void;
  /** Optional `data-test-subj` attribute for testing. */
  'data-test-subj'?: string;
}

interface CreatorOptionData {
  uid: string;
  kind: 'user' | 'managed' | 'no_creator';
}

/**
 * "Created by" filter popover for the toolbar.
 *
 * Delegates to {@link SelectableFilterPopover} with `fieldName="createdBy"`,
 * gaining include/exclude via modifier key, selection count, clear link,
 * and consistent layout for free.
 *
 * Query → `filters.user` sync is handled by {@link useCreatedByQueryResolver}.
 *
 * Phase 2 adds a search input powered by `useSuggestUserProfiles`.
 */
export const CreatedByRenderer = ({
  query,
  onChange,
  'data-test-subj': dataTestSubj = 'contentListCreatedByFilter',
}: CreatedByRendererProps) => {
  const { euiTheme } = useEuiTheme();

  const { allCreators, resolvedCreators, isReady, emailToUid } = useCreatorProfiles();

  useCreatedByQueryResolver(query, emailToUid, isReady);

  const { counts } = useContentListItems();
  const creatorCounts = counts?.[CREATED_BY_FILTER_ID];

  // Only build interactive options once profiles have resolved. While
  // loading, pass an empty list and `isLoading` to the popover so the
  // user cannot select placeholder entries that produce unresolvable
  // query values. Sentinel options (managed, no-creator) are safe to
  // show immediately since their query values are statically known.
  const options = useMemo((): Array<SelectableFilterOption<CreatorOptionData>> => {
    const result: Array<SelectableFilterOption<CreatorOptionData>> = [];

    if (allCreators.hasManaged) {
      result.push({
        key: MANAGED_USER_FILTER,
        label: i18nText.managedLabel,
        value: MANAGED_QUERY_VALUE,
        count: creatorCounts?.[MANAGED_USER_FILTER],
        data: { uid: MANAGED_USER_FILTER, kind: 'managed' },
      });
    }

    if (resolvedCreators) {
      for (const { uid, user } of resolvedCreators) {
        result.push({
          key: uid,
          label: user.full_name ?? user.username,
          value: user.email ?? user.username,
          count: creatorCounts?.[uid],
          data: { uid, kind: 'user' },
        });
      }
    }

    if (allCreators.hasNoCreator) {
      result.push({
        key: NO_CREATOR_USER_FILTER,
        label: i18nText.noCreatorLabel,
        value: NO_CREATOR_QUERY_VALUE,
        count: creatorCounts?.[NO_CREATOR_USER_FILTER],
        data: { uid: NO_CREATOR_USER_FILTER, kind: 'no_creator' },
      });
    }

    return result;
  }, [allCreators, resolvedCreators, creatorCounts]);

  const renderOption = useCallback(
    (
      option: SelectableFilterOption<CreatorOptionData>,
      { isActive }: { checked: 'on' | 'off' | undefined; isActive: boolean }
    ) => {
      if (!option.data) {
        return null;
      }
      const { kind, uid } = option.data;
      let avatar: React.ReactNode;
      if (kind === 'managed') {
        avatar = <ManagedAvatarTip />;
      } else if (kind === 'no_creator') {
        avatar = <NoCreatorTip />;
      } else {
        avatar = <UserAvatarTip {...{ uid }} />;
      }
      return (
        <StandardFilterOption count={option.count} {...{ isActive }}>
          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>{avatar}</EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText size="s">{option.label}</EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </StandardFilterOption>
      );
    },
    []
  );

  return (
    <SelectableFilterPopover<CreatorOptionData>
      fieldName="createdBy"
      title={i18nText.title}
      isLoading={allCreators.uids.length > 0 && !resolvedCreators}
      {...{ query, onChange, options, renderOption }}
      panelWidth={euiTheme.base * 20}
      data-test-subj={dataTestSubj}
    />
  );
};
