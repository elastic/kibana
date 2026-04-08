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
import { EuiAvatar, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { UserAvatarTip } from '@kbn/user-profile-components';
import { useCreatedByFilterToggle, useUserProfileStoreContext } from '@kbn/content-list-provider';

/** Props for the {@link CreatedByCell} component. */
export interface CreatedByCellProps {
  /** The user ID (`uid`) of the item's creator. */
  createdBy?: string;
  /** Whether the item is system-managed (e.g. part of a package). */
  managed?: boolean;
}

const cellCss = css`
  display: inline-flex;
  align-items: center;
  cursor: pointer;
`;

/**
 * Determine the filter type from a keyboard or mouse event's modifier keys.
 * Cmd (Mac) or Ctrl (Windows/Linux) → exclude; otherwise → include.
 */
const getFilterType = (e: { metaKey: boolean; ctrlKey: boolean }): 'include' | 'exclude' =>
  e.metaKey || e.ctrlKey ? 'exclude' : 'include';

const MANAGED_LABEL = i18n.translate(
  'contentManagement.contentList.table.createdByCell.managedLabel',
  { defaultMessage: 'Managed' }
);

/**
 * Cell renderer for `Column.CreatedBy`.
 *
 * Renders a clickable avatar for the item's creator. Clicking the avatar
 * toggles an include filter for that user; holding Cmd/Ctrl toggles an
 * exclude filter instead.
 *
 * Managed items display a non-interactive "Managed" indicator instead of
 * the creator's avatar, consistent with the sentinel-based filtering in
 * the `getCreatorKey` layer.
 */
export const CreatedByCell = memo(({ createdBy, managed }: CreatedByCellProps) => {
  const userProfileStore = useUserProfileStoreContext();
  const toggleFilter = useCreatedByFilterToggle();
  const user = !managed && createdBy ? userProfileStore?.resolve(createdBy) : undefined;

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (!createdBy) {
        return;
      }
      toggleFilter(createdBy, getFilterType(e));
    },
    [createdBy, toggleFilter]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!createdBy) {
        return;
      }
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggleFilter(createdBy, getFilterType(e));
      }
    },
    [createdBy, toggleFilter]
  );

  if (managed) {
    return (
      <EuiToolTip content={MANAGED_LABEL} position="top">
        <EuiAvatar
          name={MANAGED_LABEL}
          size="s"
          iconType="package"
          color="subdued"
          data-test-subj="content-list-createdBy-managed"
        />
      </EuiToolTip>
    );
  }

  if (!user) {
    return <span>—</span>;
  }

  return (
    <span
      css={cellCss}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      aria-label={i18n.translate(
        'contentManagement.contentList.table.createdByCell.filterAriaLabel',
        { defaultMessage: 'Filter by creator: {name}', values: { name: user.fullName } }
      )}
      data-test-subj="content-list-createdBy-avatar"
    >
      <UserAvatarTip {...{ user: user.user, avatar: user.avatar, size: 's' }} />
    </span>
  );
});

CreatedByCell.displayName = 'CreatedByCell';
