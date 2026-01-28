/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useMemo } from 'react';
import { EuiFilterButton, type Query } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

/**
 * Props for the {@link StarredRenderer} component.
 */
export interface StarredRendererProps {
  /** Custom label for the filter button. */
  name?: string;
  /** Query object from `EuiSearchBar`. */
  query?: Query;
  /** Callback when filter changes. */
  onChange?: (query: Query) => void;
  /** Optional `data-test-subj` attribute for testing. */
  'data-test-subj'?: string;
}

const i18nText = {
  starred: i18n.translate('contentManagement.contentList.starredRenderer.label', {
    defaultMessage: 'Starred',
  }),
};

/**
 * `StarredRenderer` component for `EuiSearchBar` `custom_component` filter.
 *
 * Renders a toggle button with a star icon that filters by starred items.
 * Uses the `is:starred` clause in the query.
 *
 * @param props - The component props. See {@link StarredRendererProps}.
 * @returns A React element containing the starred filter button.
 */
export const StarredRenderer = ({
  name,
  query,
  onChange,
  'data-test-subj': dataTestSubj = 'contentListStarredRenderer',
}: StarredRendererProps) => {
  // Check if starred filter is active by looking for `is:starred` in the query.
  const isActive = useMemo(() => {
    if (!query) {
      return false;
    }
    // Use Query's getIsClause method to check if the clause exists.
    const clause = query.getIsClause('starred');
    return clause != null;
  }, [query]);

  const handleClick = useCallback(() => {
    if (!query || !onChange) {
      return;
    }

    // Use Query's methods to add/remove the is clause.
    const newQuery = isActive ? query.removeIsClause('starred') : query.addMustIsClause('starred');

    onChange(newQuery);
  }, [query, onChange, isActive]);

  const label = name ?? i18nText.starred;

  return (
    <EuiFilterButton
      iconType={isActive ? 'starFilled' : 'starEmpty'}
      iconSide="left"
      isToggle={true}
      isSelected={isActive}
      hasActiveFilters={isActive}
      onClick={handleClick}
      data-test-subj={dataTestSubj}
    >
      {label}
    </EuiFilterButton>
  );
};
