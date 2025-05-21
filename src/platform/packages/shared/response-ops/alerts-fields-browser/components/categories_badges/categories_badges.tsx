/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback } from 'react';
import { EuiBadge, EuiFlexGroup, EuiFlexItem, useEuiTheme } from '@elastic/eui';
import { styles } from './categories_badges.styles';

export interface CategoriesBadgesProps {
  setSelectedCategoryIds: (categoryIds: string[]) => void;
  selectedCategoryIds: string[];
}

const CategoriesBadgesComponent: React.FC<CategoriesBadgesProps> = ({
  setSelectedCategoryIds,
  selectedCategoryIds,
}) => {
  const { euiTheme } = useEuiTheme();
  const onUnselectCategory = useCallback(
    (categoryId: string) => {
      setSelectedCategoryIds(
        selectedCategoryIds.filter((selectedCategoryId) => selectedCategoryId !== categoryId)
      );
    },
    [setSelectedCategoryIds, selectedCategoryIds]
  );

  return (
    <EuiFlexGroup
      css={styles.badgesGroup({ euiTheme })}
      data-test-subj="category-badges"
      gutterSize="xs"
      wrap
    >
      {selectedCategoryIds.map((categoryId) => (
        <EuiFlexItem grow={false} key={categoryId}>
          <EuiBadge
            iconType="cross"
            iconSide="right"
            iconOnClick={() => onUnselectCategory(categoryId)}
            iconOnClickAriaLabel="unselect category"
            data-test-subj={`category-badge-${categoryId}`}
            closeButtonProps={{ 'data-test-subj': `category-badge-unselect-${categoryId}` }}
          >
            {categoryId}
          </EuiBadge>
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
};

export const CategoriesBadges = React.memo(CategoriesBadgesComponent);
