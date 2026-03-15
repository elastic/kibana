/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState, useMemo, useCallback } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiText, useEuiTheme, type Query } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { MANAGED_USER_FILTER, NO_CREATOR_USER_FILTER } from '@kbn/content-list-provider';
import {
  UserAvatarTip,
  ManagedAvatarTip,
  NoCreatorTip,
} from '@kbn/content-management-user-profiles';
import { MANAGED_QUERY_VALUE, NO_CREATOR_QUERY_VALUE } from '@kbn/content-list-provider';
import {
  SelectableFilterPopover,
  StandardFilterOption,
  type SelectableFilterOption,
} from '../selectable_filter_popover';
import { useCreatorProfiles } from './use_creator_profiles';
import { useCreatedByQueryResolver } from './use_created_by_query_resolver';

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
 * and consistent layout for free. The built-in `EuiSelectable` search box
 * is used for filtering the option list.
 *
 * Query -> `filters.user` sync is handled by {@link useCreatedByQueryResolver}.
 */
export const CreatedByRenderer = ({
  query,
  onChange,
  'data-test-subj': dataTestSubj = 'contentListCreatedByFilter',
}: CreatedByRendererProps) => {
  const { euiTheme } = useEuiTheme();
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const { facets, isLoading, isReady, emailToUid } = useCreatorProfiles(isPopoverOpen);

  useCreatedByQueryResolver(query, emailToUid, isReady);

  // Build options from facets provided by `getMetadata`.
  const options = useMemo((): Array<SelectableFilterOption<CreatorOptionData>> => {
    if (!facets) {
      return [];
    }
    return facets.map((facet) => {
      const kind = facet.data?.kind as string | undefined;
      if (kind === 'managed') {
        return {
          key: MANAGED_USER_FILTER,
          label: i18nText.managedLabel,
          value: MANAGED_QUERY_VALUE,
          count: facet.count,
          data: { uid: MANAGED_USER_FILTER, kind: 'managed' as const },
        };
      }
      if (kind === 'no_creator') {
        return {
          key: NO_CREATOR_USER_FILTER,
          label: i18nText.noCreatorLabel,
          value: NO_CREATOR_QUERY_VALUE,
          count: facet.count,
          data: { uid: NO_CREATOR_USER_FILTER, kind: 'no_creator' as const },
        };
      }
      const user = facet.data?.user as { email?: string; username: string } | undefined;
      return {
        key: facet.key,
        label: facet.label,
        value: user?.email ?? user?.username ?? facet.label,
        count: facet.count,
        data: { uid: facet.key, kind: 'user' as const },
      };
    });
  }, [facets]);

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

  const onPopoverToggle = useCallback((open: boolean) => {
    setIsPopoverOpen(open);
  }, []);

  return (
    <SelectableFilterPopover<CreatorOptionData>
      fieldName="createdBy"
      title={i18nText.title}
      isLoading={isLoading}
      {...{ query, onChange, options, renderOption }}
      panelWidth={euiTheme.base * 20}
      data-test-subj={dataTestSubj}
      onToggle={onPopoverToggle}
    />
  );
};
