/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { memo, useCallback } from 'react';
import { EuiButtonEmpty, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import {
  UserAvatarTip,
  ManagedAvatarTip,
  NoCreatorTip,
} from '@kbn/content-management-user-profiles';
import { useQueryFilter, useContentListState } from '@kbn/content-list-provider';

export interface CreatedByCellProps {
  /**
   * User ID (uid) of the creator
   */
  uid?: string;
  /**
   * Whether the content is managed (system-created)
   */
  managed?: boolean;
  /**
   * Entity name for managed content tooltip
   */
  entityName?: string;
}

/**
 * Default renderer for the createdBy column.
 * Shows user avatar with tooltip, or appropriate placeholder for managed/unknown content.
 * Clicking on a user avatar toggles the createdBy filter.
 * Matches the behavior of TableListView's creator column.
 *
 * Memoized to prevent unnecessary re-renders - only updates when uid, managed, or entityName changes.
 */
export const CreatedByCell = memo(
  ({ uid, managed, entityName = 'content' }: CreatedByCellProps) => {
    const { euiTheme } = useEuiTheme();
    const { createdByResolver } = useContentListState();
    const { toggle } = useQueryFilter('createdBy', { resolver: createdByResolver });

    // Handle avatar click - toggle createdBy filter using display value (username).
    // The resolver deduplicates by canonical (UID), so clicking won't create duplicates.
    // Using display value keeps the search bar user-friendly (no UIDs shown).
    const handleClick = useCallback(() => {
      if (!uid) {
        return;
      }
      // Get the display value (username) for this UID from the resolver.
      // If not found, falls back to the UID itself.
      const displayValue = createdByResolver.getDisplay(uid);
      toggle(displayValue);
    }, [uid, toggle, createdByResolver]);

    // Style for clickable avatar wrapper
    const clickableStyle = css`
      padding: 0;
      block-size: auto;
      &:hover {
        background: ${euiTheme.colors.lightShade};
        border-radius: ${euiTheme.border.radius.medium};
      }
    `;

    // User exists - show clickable avatar with tooltip
    if (uid) {
      return (
        <EuiButtonEmpty
          css={clickableStyle}
          onClick={handleClick}
          data-test-subj="createdByCellButton"
          flush="both"
        >
          <UserAvatarTip uid={uid} />
        </EuiButtonEmpty>
      );
    }

    // Managed content - show Elastic icon
    if (managed) {
      return <ManagedAvatarTip entityName={entityName} />;
    }

    // No creator info - show placeholder
    return <NoCreatorTip iconType="minus" />;
  },
  (prevProps, nextProps) => {
    // Only re-render if relevant props changed
    return (
      prevProps.uid === nextProps.uid &&
      prevProps.managed === nextProps.managed &&
      prevProps.entityName === nextProps.entityName
    );
  }
);

CreatedByCell.displayName = 'CreatedByCell';
