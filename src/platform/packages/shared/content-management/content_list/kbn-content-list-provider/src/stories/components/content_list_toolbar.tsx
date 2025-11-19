/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFieldSearch,
  EuiButtonGroup,
  EuiText,
  EuiBadge,
  EuiSpacer,
  EuiPanel,
  EuiFilterGroup,
  EuiFilterButton,
  EuiToolTip,
} from '@elastic/eui';
import {
  useContentListSearch,
  useContentListFilters,
  useContentListSort,
  useContentListConfig,
} from '../..';

// -----------------------------------------------------------------------------
// Tag Configuration
// -----------------------------------------------------------------------------

/** Demo tags available for filtering. Maps tag ID to display name. */
const DEMO_TAGS = [
  { id: 'tag-important', name: 'Important' },
  { id: 'tag-production', name: 'Production' },
  { id: 'tag-archived', name: 'Archived' },
] as const;

const TAG_ID_TO_NAME = Object.fromEntries(DEMO_TAGS.map(({ id, name }) => [id, name]));

// -----------------------------------------------------------------------------
// Tag Filter Helpers
// -----------------------------------------------------------------------------

type TagState = 'off' | 'include' | 'exclude';

const getTagState = (tagId: string, include: string[], exclude: string[]): TagState =>
  include.includes(tagId) ? 'include' : exclude.includes(tagId) ? 'exclude' : 'off';

const cycleTagState = (state: TagState): TagState =>
  state === 'off' ? 'include' : state === 'include' ? 'exclude' : 'off';

/**
 * Updates the search query to add/remove tag filter clauses.
 * This keeps the search box and tag buttons in sync.
 */
const updateQueryWithTag = (query: string, tagName: string, newState: TagState): string => {
  // Remove any existing clauses for this tag.
  const includePattern = new RegExp(`\\s*\\btag:${tagName}\\b\\s*`, 'gi');
  const excludePattern = new RegExp(`\\s*-tag:${tagName}\\b\\s*`, 'gi');
  let newQuery = query.replace(excludePattern, ' ').replace(includePattern, ' ');

  // Add new clause based on state.
  if (newState === 'include') {
    newQuery = `tag:${tagName} ${newQuery}`;
  } else if (newState === 'exclude') {
    newQuery = `-tag:${tagName} ${newQuery}`;
  }

  return newQuery.replace(/\s+/g, ' ').trim();
};

/**
 * Updates the search query to add/remove `is:starred` clause.
 * This keeps the search box and starred button in sync.
 */
const updateQueryWithStarred = (query: string, isStarred: boolean): string => {
  // Remove any existing is:starred clause.
  const starredPattern = /\s*\bis:starred\b\s*/gi;
  let newQuery = query.replace(starredPattern, ' ');

  // Add clause if starred is enabled.
  if (isStarred) {
    newQuery = `is:starred ${newQuery}`;
  }

  return newQuery.replace(/\s+/g, ' ').trim();
};

// -----------------------------------------------------------------------------
// Sub-components
// -----------------------------------------------------------------------------

/** Removable filter badge for active filters display. */
const FilterBadge: React.FC<{ label: string; color: string; onRemove: () => void }> = ({
  label,
  color,
  onRemove,
}) => (
  <EuiBadge color={color} onClick={onRemove} onClickAriaLabel="Remove filter">
    {label}
  </EuiBadge>
);

// -----------------------------------------------------------------------------
// Main Toolbar Component
// -----------------------------------------------------------------------------

/**
 * Toolbar demonstrating provider search, filter, and sort capabilities.
 *
 * This component shows how to use the provider's hooks:
 * - `useContentListSearch()` - Search query and setter
 * - `useContentListFilters()` - Active filters and setters
 * - `useContentListSort()` - Sort field/direction and setter
 * - `useContentListConfig()` - Feature flags and entity names
 *
 * Note: Pagination is handled by the table component via `useContentListPagination()`.
 */
export const ContentListToolbar: React.FC = () => {
  // Get state and setters from provider hooks.
  const { queryText, setSearch } = useContentListSearch();
  const { filters, setFilters, clearFilters } = useContentListFilters();
  const { field: sortField, direction: sortDirection, setSort } = useContentListSort();
  const config = useContentListConfig();

  // Extract tag filter state.
  const includeTags = filters.tags?.include ?? [];
  const excludeTags = filters.tags?.exclude ?? [];
  const hasActiveFilters = Boolean(
    includeTags.length > 0 || excludeTags.length > 0 || filters.starredOnly
  );

  // Check which features are enabled.
  const isSearchEnabled = config.features.search !== false;
  const isFilteringEnabled = config.features.filtering !== false;
  const isSortingEnabled = config.features.sorting !== false;

  // Hide toolbar if no features are enabled.
  if (!isSearchEnabled && !isFilteringEnabled && !isSortingEnabled) {
    return null;
  }

  // Handle tag button click - cycles through off → include → exclude → off.
  const handleTagClick = (tagId: string) => {
    const tagName = TAG_ID_TO_NAME[tagId];
    if (!tagName) {
      return;
    }

    const currentState = getTagState(tagId, includeTags, excludeTags);
    const nextState = cycleTagState(currentState);
    const newQuery = updateQueryWithTag(queryText, tagName, nextState);
    setSearch(newQuery);
  };

  // Remove a tag from the search query.
  const handleRemoveTag = (tagId: string, type: 'include' | 'exclude') => {
    const tagName = TAG_ID_TO_NAME[tagId];
    if (!tagName) {
      // Fallback: directly update filters if tag name not found.
      const newTags =
        type === 'include'
          ? { include: includeTags.filter((t) => t !== tagId), exclude: excludeTags }
          : { include: includeTags, exclude: excludeTags.filter((t) => t !== tagId) };
      setFilters({ ...filters, tags: newTags });
      return;
    }

    const pattern =
      type === 'include'
        ? new RegExp(`\\s*\\btag:${tagName}\\b\\s*`, 'gi')
        : new RegExp(`\\s*-tag:${tagName}\\b\\s*`, 'gi');
    const newQuery = queryText.replace(pattern, ' ').replace(/\s+/g, ' ').trim();
    setSearch(newQuery);
  };

  // Handle starred button click - toggles starred filter via query text.
  const handleStarredClick = () => {
    const isCurrentlyStarred = !!filters.starredOnly;
    const newQuery = updateQueryWithStarred(queryText, !isCurrentlyStarred);
    setSearch(newQuery);
  };

  // Remove starred filter from the search query.
  const handleRemoveStarred = () => {
    const newQuery = updateQueryWithStarred(queryText, false);
    setSearch(newQuery);
  };

  // Handle clearing all filters - clears both state filters and filter clauses from query text.
  const handleClearAllFilters = () => {
    clearFilters();
    // Update the query to keep only the clean search text (without filter clauses).
    // `filters.search` is the parsed clean search text from the query.
    setSearch(filters.search ?? '');
  };

  // Get button props based on tag state.
  const getTagButtonProps = (tagId: string) => {
    const state = getTagState(tagId, includeTags, excludeTags);
    return {
      hasActiveFilters: state !== 'off',
      color: state === 'include' ? 'success' : state === 'exclude' ? 'danger' : undefined,
    } as const;
  };

  return (
    <EuiPanel paddingSize="m" hasBorder>
      <EuiFlexGroup gutterSize="m" alignItems="center" wrap>
        {/* Search input with query syntax support. */}
        {isSearchEnabled && (
          <EuiFlexItem grow style={{ minWidth: 250 }}>
            <EuiToolTip
              content="Supports: tag:Name, -tag:Name, is:starred, createdBy:user"
              position="bottom"
            >
              <EuiFieldSearch
                value={queryText}
                onChange={(e) => setSearch(typeof e === 'string' ? e : e.currentTarget.value)}
                placeholder={`Search ${config.entityNamePlural}...`}
                fullWidth
                isClearable
              />
            </EuiToolTip>
          </EuiFlexItem>
        )}

        {/* Tag and starred filter buttons. */}
        {isFilteringEnabled && (
          <EuiFlexItem grow={false}>
            <EuiFilterGroup>
              {config.supports.tags &&
                DEMO_TAGS.map(({ id, name }) => {
                  const state = getTagState(id, includeTags, excludeTags);
                  const tooltip =
                    state === 'off'
                      ? 'Click to include'
                      : state === 'include'
                      ? 'Click to exclude'
                      : 'Click to clear';

                  return (
                    <EuiToolTip key={id} content={tooltip} position="top">
                      <EuiFilterButton
                        {...getTagButtonProps(id)}
                        onClick={() => handleTagClick(id)}
                      >
                        {state === 'exclude' ? `NOT ${name}` : name}
                      </EuiFilterButton>
                    </EuiToolTip>
                  );
                })}

              {config.supports.starred && (
                <EuiFilterButton
                  hasActiveFilters={!!filters.starredOnly}
                  iconType="starFilled"
                  onClick={handleStarredClick}
                  color={filters.starredOnly ? 'success' : undefined}
                >
                  Starred
                </EuiFilterButton>
              )}
            </EuiFilterGroup>
          </EuiFlexItem>
        )}

        {/* Sort controls. */}
        {isSortingEnabled && (
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="xs" alignItems="center">
              <EuiFlexItem grow={false}>
                <EuiText size="xs" color="subdued">
                  Sort:
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButtonGroup
                  legend="Sort field"
                  options={[
                    { id: 'title', label: 'Title' },
                    { id: 'updatedAt', label: 'Updated' },
                  ]}
                  idSelected={sortField}
                  onChange={(id) => setSort(id, sortDirection)}
                  buttonSize="compressed"
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButtonGroup
                  legend="Sort direction"
                  options={[
                    { id: 'asc', label: '↑' },
                    { id: 'desc', label: '↓' },
                  ]}
                  idSelected={sortDirection}
                  onChange={(id) => setSort(sortField, id as 'asc' | 'desc')}
                  buttonSize="compressed"
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>

      {/* Active filters display. */}
      {hasActiveFilters && (
        <>
          <EuiSpacer size="s" />
          <EuiFlexGroup gutterSize="xs" alignItems="center" wrap>
            <EuiFlexItem grow={false}>
              <EuiToolTip content="Clear all filters">
                <EuiBadge
                  color="hollow"
                  iconType="cross"
                  iconSide="left"
                  onClick={handleClearAllFilters}
                  onClickAriaLabel="Clear all filters"
                >
                  Clear
                </EuiBadge>
              </EuiToolTip>
            </EuiFlexItem>

            {includeTags.map((tagId) => (
              <EuiFlexItem key={tagId} grow={false}>
                <FilterBadge
                  label={TAG_ID_TO_NAME[tagId] ?? tagId}
                  color="primary"
                  onRemove={() => handleRemoveTag(tagId, 'include')}
                />
              </EuiFlexItem>
            ))}

            {excludeTags.map((tagId) => (
              <EuiFlexItem key={tagId} grow={false}>
                <FilterBadge
                  label={`NOT ${TAG_ID_TO_NAME[tagId] ?? tagId}`}
                  color="danger"
                  onRemove={() => handleRemoveTag(tagId, 'exclude')}
                />
              </EuiFlexItem>
            ))}

            {filters.starredOnly && (
              <EuiFlexItem grow={false}>
                <FilterBadge label="Starred" color="warning" onRemove={handleRemoveStarred} />
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </>
      )}
    </EuiPanel>
  );
};
