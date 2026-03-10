/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { memo, useCallback } from 'react';
import { css } from '@emotion/react';
import {
  UserAvatarTip,
  ManagedAvatarTip,
  NoCreatorTip,
  useUserProfile,
} from '@kbn/content-management-user-profiles';
import {
  useUserFilterToggle,
  MANAGED_USER_FILTER,
  type ContentListItem,
} from '@kbn/content-list-provider';

const avatarButtonStyles = css`
  cursor: pointer;
  background: none;
  border: none;
  padding: 0;
  line-height: 0;

  &:hover {
    opacity: 0.7;
  }
`;

/**
 * Props for the {@link CreatedByCell} component.
 */
export interface CreatedByCellProps {
  /** The content list item to render the creator for. */
  item: ContentListItem;
  /**
   * Entity name for display in the managed/no-creator tooltips.
   * Passed through to `ManagedAvatarTip` and `NoCreatorTip`.
   */
  entityName?: string;
  /**
   * Plural entity name for display in the no-creator tooltip.
   * Passed through to `NoCreatorTip`.
   */
  entityNamePlural?: string;
}

/**
 * Clickable user avatar that toggles the created-by filter on click.
 *
 * Fetches the user profile to resolve the email for the query bar display value.
 * Uses `useUserProfile`, which is deduplicated and cached via React Query.
 */
const ClickableUserAvatar = memo(
  ({ uid, toggle }: { uid: string; toggle: (uid: string, queryValue: string) => void }) => {
    const profileQuery = useUserProfile(uid);
    const queryValue = profileQuery.data?.user.email ?? profileQuery.data?.user.username ?? uid;

    const handleClick = useCallback(() => {
      toggle(uid, queryValue);
    }, [uid, queryValue, toggle]);

    return (
      <button type="button" css={avatarButtonStyles} onClick={handleClick}>
        <UserAvatarTip uid={uid} />
      </button>
    );
  }
);

ClickableUserAvatar.displayName = 'ClickableUserAvatar';

/**
 * Clickable managed avatar that toggles the managed filter on click.
 */
const ClickableManagedAvatar = memo(
  ({
    entityName,
    toggle,
  }: {
    entityName?: string;
    toggle: (uid: string, queryValue: string) => void;
  }) => {
    const handleClick = useCallback(() => {
      toggle(MANAGED_USER_FILTER, 'managed');
    }, [toggle]);

    return (
      <button type="button" css={avatarButtonStyles} onClick={handleClick}>
        <ManagedAvatarTip {...{ entityName }} />
      </button>
    );
  }
);

ClickableManagedAvatar.displayName = 'ClickableManagedAvatar';

/**
 * Renders the appropriate avatar or tip for a content list item's creator.
 *
 * - **Managed items**: Shows the Elastic logo (`ManagedAvatarTip`).
 * - **Items with a `createdBy` uid**: Shows the user's avatar (`UserAvatarTip`).
 * - **Items without a creator**: Shows an info tip (`NoCreatorTip`).
 *
 * When created-by filtering is supported, clicking the avatar toggles a user
 * filter — the same behavior tags have in the name cell. The query bar updates
 * to show `createdBy:(email)`.
 *
 * Requires `UserProfilesProvider` to be an ancestor in the component tree.
 * This is automatically provided by `ContentListProvider` when `services.userProfile`
 * is configured.
 */
export const CreatedByCell = memo(({ item, entityName, entityNamePlural }: CreatedByCellProps) => {
  const { createdBy, managed } = item;
  const toggleUser = useUserFilterToggle();

  if (managed) {
    if (toggleUser) {
      return <ClickableManagedAvatar {...{ entityName, toggle: toggleUser }} />;
    }
    return <ManagedAvatarTip {...{ entityName }} />;
  }

  if (createdBy) {
    if (toggleUser) {
      return <ClickableUserAvatar uid={createdBy} toggle={toggleUser} />;
    }
    return <UserAvatarTip uid={createdBy} />;
  }

  return <NoCreatorTip {...{ entityNamePlural }} />;
});

CreatedByCell.displayName = 'CreatedByCell';
