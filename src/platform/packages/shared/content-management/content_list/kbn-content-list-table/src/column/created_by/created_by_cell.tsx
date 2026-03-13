/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback } from 'react';
import { EuiButtonEmpty } from '@elastic/eui';
import {
  MANAGED_USER_FILTER,
  NO_CREATOR_USER_FILTER,
  MANAGED_QUERY_VALUE,
  NO_CREATOR_QUERY_VALUE,
  useUserFilterToggle,
} from '@kbn/content-list-provider';
import {
  UserAvatarTip,
  ManagedAvatarTip,
  NoCreatorTip,
  useUserProfile,
} from '@kbn/content-management-user-profiles';
import type { ContentListItem } from '@kbn/content-list-provider';

/**
 * Props for {@link CreatedByCell}.
 */
export interface CreatedByCellProps {
  /** The content list item to render the creator for. */
  item: ContentListItem;
}

/**
 * Clickable avatar for a real user creator.
 *
 * Fetches the profile (typically a cache hit from the bulk fetch) to
 * resolve the canonical email for the `queryValue` written to the query bar.
 */
const UserCreatorAvatar = ({
  uid,
  toggle,
}: {
  uid: string;
  toggle: (uid: string, queryValue: string) => void;
}) => {
  const { data: profile } = useUserProfile(uid);
  const queryValue = profile?.user.email ?? profile?.user.username ?? uid;

  const handleClick = useCallback(() => {
    toggle(uid, queryValue);
  }, [toggle, uid, queryValue]);

  return (
    <EuiButtonEmpty
      onClick={handleClick}
      flush="both"
      css={{ blockSize: 'auto' }}
      data-test-subj="content-list-table-createdBy-toggle"
    >
      <UserAvatarTip {...{ uid }} />
    </EuiButtonEmpty>
  );
};

/**
 * Table cell component for the "Created by" column.
 *
 * Renders the appropriate avatar (user, managed, or no-creator) and
 * makes it clickable to toggle the user filter when supported.
 */
export const CreatedByCell = ({ item }: CreatedByCellProps) => {
  const toggle = useUserFilterToggle();
  const { createdBy, managed } = item;

  const handleSentinelClick = useCallback(
    (uid: string, queryValue: string) => {
      toggle?.(uid, queryValue);
    },
    [toggle]
  );

  if (managed) {
    const avatar = <ManagedAvatarTip />;
    if (!toggle) {
      return <>{avatar}</>;
    }
    return (
      <EuiButtonEmpty
        onClick={() => handleSentinelClick(MANAGED_USER_FILTER, MANAGED_QUERY_VALUE)}
        flush="both"
        css={{ blockSize: 'auto' }}
        data-test-subj="content-list-table-createdBy-toggle"
      >
        {avatar}
      </EuiButtonEmpty>
    );
  }

  if (createdBy) {
    if (!toggle) {
      return <UserAvatarTip uid={createdBy} />;
    }
    return <UserCreatorAvatar uid={createdBy} {...{ toggle }} />;
  }

  const avatar = <NoCreatorTip />;
  if (!toggle) {
    return <>{avatar}</>;
  }
  return (
    <EuiButtonEmpty
      onClick={() => handleSentinelClick(NO_CREATOR_USER_FILTER, NO_CREATOR_QUERY_VALUE)}
      flush="both"
      css={{ blockSize: 'auto' }}
      data-test-subj="content-list-table-createdBy-toggle"
    >
      {avatar}
    </EuiButtonEmpty>
  );
};
