/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useMemo, useState } from 'react';
import type { ReactElement, ReactNode } from 'react';
import reactElementToJSXString from 'react-element-to-jsx-string';
import { css } from '@emotion/react';
import {
  EuiBadge,
  EuiButtonIcon,
  EuiCodeBlock,
  EuiDescriptionList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import {
  useContentListItems,
  useContentListSort,
  useContentListPagination,
  useContentListConfig,
  MANAGED_USER_FILTER,
  MANAGED_USER_LABEL,
  NO_CREATOR_USER_FILTER,
  NO_CREATOR_USER_LABEL,
} from '@kbn/content-list-provider';
import type {
  ContentListItem,
  FindItemsParams,
  FindItemsResult,
  FilterFacetConfig,
  UserProfileEntry,
} from '@kbn/content-list-provider';
import type { Tag } from '@kbn/content-management-tags';
import type { FavoritesClientPublic } from '@kbn/content-management-favorites-public';
import type { UserContentCommonSchema } from '@kbn/content-management-table-list-view-common';
import {
  MOCK_DASHBOARDS,
  createMockFindItems,
  createMockFavoritesClient,
  extractTagIds,
  mockTagsService,
  mockContentListUserProfilesServices,
  MOCK_USER_PROFILES_MAP,
} from '@kbn/content-list-mock-data';

export { mockTagsService, createMockFavoritesClient, mockContentListUserProfilesServices };

// =============================================================================
// Inspect Flyout (mock content editor)
// =============================================================================

/**
 * Mock "View details" flyout for Storybook stories.
 *
 * Renders a lightweight EuiFlyout showing item metadata. Stands in for the
 * real Kibana content editor flyout (`@kbn/content-management-content-editor`)
 * which requires Kibana core services not available in Storybook.
 */
const inspectFlyoutTitleId = 'inspect-flyout-title';

const InspectFlyout = ({ item, onClose }: { item: ContentListItem; onClose: () => void }) => (
  <EuiFlyout onClose={onClose} size="s" ownFocus aria-labelledby={inspectFlyoutTitleId}>
    <EuiFlyoutHeader hasBorder>
      <EuiTitle size="m">
        <h2 id={inspectFlyoutTitleId}>{item.title}</h2>
      </EuiTitle>
    </EuiFlyoutHeader>
    <EuiFlyoutBody>
      <EuiDescriptionList
        type="column"
        compressed
        listItems={[
          { title: 'ID', description: item.id },
          { title: 'Description', description: item.description || '—' },
          { title: 'Type', description: item.type || '—' },
          {
            title: 'Updated',
            description: item.updatedAt ? new Date(item.updatedAt).toLocaleString() : '—',
          },
          { title: 'Tags', description: item.tags?.join(', ') || '—' },
        ]}
      />
    </EuiFlyoutBody>
  </EuiFlyout>
);

/**
 * Hook that manages the open/close state for a mock inspect flyout.
 *
 * Returns an `onInspect` callback suitable for `ContentListItemConfig.onInspect`
 * and a `flyout` element to render in the component tree.
 *
 * @example
 * ```tsx
 * const { onInspect, flyout } = useInspectFlyout();
 * // pass onInspect to item config, render {flyout} in JSX
 * ```
 */
export const useInspectFlyout = (): {
  onInspect: (item: ContentListItem) => void;
  flyout: ReactNode;
} => {
  const [inspectedItem, setInspectedItem] = useState<ContentListItem | null>(null);
  const onInspect = useCallback((item: ContentListItem) => setInspectedItem(item), []);
  const flyout = inspectedItem ? (
    <InspectFlyout item={inspectedItem} onClose={() => setInspectedItem(null)} />
  ) : null;

  return { onInspect, flyout };
};

// =============================================================================
// Mock Data
// =============================================================================

/**
 * Build a mock items array of the requested length by cycling through
 * `MOCK_DASHBOARDS` and appending an index suffix when wrapping.
 */
export const buildMockItems = (count: number): typeof MOCK_DASHBOARDS => {
  const base = MOCK_DASHBOARDS;
  if (count <= base.length) {
    return base.slice(0, count);
  }

  return Array.from({ length: count }, (_, i) => {
    const source = base[i % base.length];
    return i < base.length
      ? source
      : {
          ...source,
          id: `${source.id}-${i}`,
          attributes: {
            ...source.attributes,
            title: `${source.attributes.title} (${i + 1})`,
          },
        };
  });
};

/**
 * Creates a mock `findItems` function with configurable behavior.
 * Shared across Content List story files.
 *
 * Pass the same `favoritesClient` instance used for `services.favorites`
 * on the provider so that starred items are immediately visible when the
 * `starred` filter is toggled (both sides share the same in-memory set).
 */
export const createStoryFindItems = (options?: {
  totalItems?: number;
  delay?: number;
  isEmpty?: boolean;
  favoritesClient?: FavoritesClientPublic;
}) => {
  const {
    totalItems = MOCK_DASHBOARDS.length,
    delay = 0,
    isEmpty = false,
    favoritesClient,
  } = options ?? {};

  const items = buildMockItems(totalItems);
  const mockFindItems = createMockFindItems({ items, favoritesClient });

  return async (params: FindItemsParams): Promise<FindItemsResult> => {
    if (delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    if (isEmpty) {
      return { items: [], total: 0 };
    }

    const result = await mockFindItems({
      searchQuery: params.searchQuery,
      filters: params.filters,
      sort: params.sort ?? { field: 'title', direction: 'asc' },
      page: params.page,
    });

    return {
      items: result.items.map((item) => ({
        id: item.id,
        title: item.attributes.title,
        description: item.attributes.description,
        type: item.type,
        updatedAt: item.updatedAt ? new Date(item.updatedAt) : undefined,
        tags: extractTagIds(item.references),
        createdBy: item.createdBy,
        managed: item.managed,
      })),
      total: result.total,
    };
  };
};

// =============================================================================
// Mock FilterFacetConfigs
// =============================================================================

/**
 * Compute per-key counts from a set of items.
 */
const computeCounts = (
  items: UserContentCommonSchema[],
  keyFn: (item: UserContentCommonSchema) => string[]
): Record<string, number> => {
  const counts: Record<string, number> = {};
  for (const item of items) {
    for (const key of keyFn(item)) {
      counts[key] = (counts[key] ?? 0) + 1;
    }
  }
  return counts;
};

/**
 * Creates a mock {@link FilterFacetConfig} for tags.
 *
 * Counts are computed from the provided `items` array. Tag metadata
 * (name, color, description) comes from `mockTagsService.getTagList()`.
 */
export const createMockTagFacetProvider = (
  items: UserContentCommonSchema[]
): FilterFacetConfig<Tag> => ({
  getFacets: async () => {
    const tagCounts = computeCounts(items, (item) =>
      (item.references ?? []).filter((ref) => ref.type === 'tag').map((ref) => ref.id)
    );
    return mockTagsService.getTagList().map((tag) => ({
      key: tag.id ?? tag.name,
      label: tag.name,
      count: tagCounts[tag.id ?? tag.name] ?? 0,
      data: tag,
    }));
  },
});

/**
 * Creates a mock {@link FilterFacetConfig} for user profiles.
 *
 * Counts are computed from the provided `items` array using `getCreatorKey`
 * logic so that managed and no-creator items produce sentinel facet entries.
 * Profile metadata comes from `MOCK_USER_PROFILES_MAP`.
 */
export const createMockUserProfileFacetProvider = (
  items: UserContentCommonSchema[]
): FilterFacetConfig<UserProfileEntry> => ({
  getFacets: async () => {
    const getCreatorKey = (item: UserContentCommonSchema): string => {
      if ((item as { managed?: boolean }).managed) {
        return MANAGED_USER_FILTER;
      }
      if (!item.createdBy) {
        return NO_CREATOR_USER_FILTER;
      }
      return item.createdBy;
    };

    const userCounts = computeCounts(items, (item) => [getCreatorKey(item)]);

    return Object.entries(userCounts).map(([key, count]) => {
      if (key === MANAGED_USER_FILTER) {
        return { key, label: MANAGED_USER_LABEL, count, data: undefined };
      }
      if (key === NO_CREATOR_USER_FILTER) {
        return { key, label: NO_CREATOR_USER_LABEL, count, data: undefined };
      }

      const profile = MOCK_USER_PROFILES_MAP[key];
      return {
        key,
        label: profile?.user.full_name ?? profile?.user.username ?? key,
        count,
        data: profile
          ? {
              uid: key,
              user: profile.user,
              email: profile.user.email ?? '',
              fullName: profile.user.full_name ?? profile.user.username,
            }
          : undefined,
      };
    });
  },
});

// =============================================================================
// JSX Serialization
// =============================================================================

/**
 * Part suffixes whose export names follow the `{Preset}{Part}` pattern
 * (e.g. `NameColumn`, `EditAction`). Used as a fallback when the assembly
 * `displayName` is unavailable at runtime.
 */
const PART_SUFFIXES = ['Column', 'Action'];

/**
 * Map assembly-generated `displayName` values to consumer-facing component
 * names.
 *
 * The assembly framework generates names like `ContentListTable.column.name`.
 * This strips the assembly prefix and PascalCases the remaining segments so
 * the output reads like the JSX a consumer would write (e.g. `Column.Name`).
 *
 * When the dotted `displayName` is unavailable (e.g. stripped by a bundler),
 * falls back to pattern-matching the export name (`NameColumn` → `Column.Name`).
 */
const formatComponentName = (element: React.ReactNode): string => {
  const type = (element as ReactElement | undefined)?.type as unknown as
    | { displayName?: string; name?: string }
    | undefined;
  const rawName: string = type?.displayName ?? type?.name ?? 'Unknown';

  // Assembly names follow "Assembly.part[.preset]".
  const segments = rawName.split('.');
  if (segments.length >= 2) {
    return segments
      .slice(1)
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
      .join('.');
  }

  // Fallback: handle export names like `NameColumn` → `Column.Name`.
  for (const suffix of PART_SUFFIXES) {
    if (rawName.endsWith(suffix) && rawName !== suffix) {
      return `${suffix}.${rawName.slice(0, -suffix.length)}`;
    }
  }

  // Strip trailing `Component` from wrapper names.
  if (rawName.endsWith('Component') && rawName !== 'Component') {
    return rawName.slice(0, -'Component'.length);
  }

  return rawName;
};

/**
 * Convert a React element to a formatted JSX string.
 *
 * Uses [`react-element-to-jsx-string`](https://npm.im/react-element-to-jsx-string)
 * with display-name mapping so assembly components render with their
 * consumer-facing API names (e.g. `<Column.Name />` instead of
 * `<ContentListTable.column.name />`).
 */
export const toJsx = (element: ReactElement): string =>
  reactElementToJSXString(element, {
    displayName: formatComponentName,
    showFunctions: true,
    functionValue: (fn) => (fn.name ? `${fn.name}()` : '…'),
    showDefaultProps: false,
    sortProps: false,
    useBooleanShorthandSyntax: true,
    useFragmentShortSyntax: true,
    filterProps: ['key'],
  });

// =============================================================================
// Styles
// =============================================================================

const sortColumnCss = css({ minWidth: 200 });
const jsxColumnCss = css({ minWidth: 300 });

// =============================================================================
// State Diagnostic Panel
// =============================================================================

export interface StateDiagnosticPanelProps {
  /** Whether the panel is open by default. */
  defaultOpen?: boolean;
  /** React element to serialize and display as JSX source code. */
  element: ReactElement;
}

/**
 * Collapsible diagnostic panel that visualizes the current provider state
 * and the React markup being rendered.
 * Shared across Content List story files.
 */
export const StateDiagnosticPanel = ({
  defaultOpen = false,
  element,
}: StateDiagnosticPanelProps) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const { items, totalItems, isLoading, error } = useContentListItems();
  const { field: sortField, direction: sortDirection } = useContentListSort();
  const { pageIndex, pageSize, pageCount, isSupported: hasPagination } = useContentListPagination();
  const config = useContentListConfig();
  const jsx = useMemo(() => toJsx(element), [element]);

  return (
    <>
      <EuiSpacer size="l" />
      <EuiPanel color="subdued" hasBorder paddingSize={isOpen ? 'm' : 's'}>
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiButtonIcon
              iconType={isOpen ? 'arrowDown' : 'arrowRight'}
              onClick={() => setIsOpen(!isOpen)}
              aria-label={isOpen ? 'Collapse diagnostic panel' : 'Expand diagnostic panel'}
              size="s"
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiTitle size="xxs">
              <h3>State Diagnostic Panel</h3>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="s" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiBadge color="hollow">
                  {items.length}/{totalItems} items
                </EuiBadge>
              </EuiFlexItem>
              {isLoading && (
                <EuiFlexItem grow={false}>
                  <EuiBadge color="primary">Loading…</EuiBadge>
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>

        {isOpen && (
          <>
            <EuiSpacer size="m" />

            <EuiFlexGroup gutterSize="m" wrap>
              <EuiFlexItem grow={false}>
                <EuiText size="s">
                  <strong>Read-Only:</strong>{' '}
                  {config.isReadOnly ? (
                    <EuiBadge color="warning">Yes</EuiBadge>
                  ) : (
                    <EuiBadge color="hollow">No</EuiBadge>
                  )}
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>

            <EuiSpacer size="m" />

            <EuiFlexGroup gutterSize="s" wrap>
              <EuiFlexItem grow={1} css={sortColumnCss}>
                <EuiTitle size="xxs">
                  <h4>Sort</h4>
                </EuiTitle>
                <EuiCodeBlock language="json" fontSize="s" paddingSize="s">
                  {JSON.stringify({ field: sortField, direction: sortDirection }, null, 2)}
                </EuiCodeBlock>
              </EuiFlexItem>
              {hasPagination && (
                <EuiFlexItem grow={1} css={sortColumnCss}>
                  <EuiTitle size="xxs">
                    <h4>Pagination</h4>
                  </EuiTitle>
                  <EuiCodeBlock language="json" fontSize="s" paddingSize="s">
                    {JSON.stringify({ pageIndex, pageSize, pageCount, totalItems }, null, 2)}
                  </EuiCodeBlock>
                </EuiFlexItem>
              )}
              <EuiFlexItem grow={2} css={jsxColumnCss}>
                <EuiTitle size="xxs">
                  <h4>Page JSX</h4>
                </EuiTitle>
                <EuiCodeBlock language="tsx" fontSize="s" paddingSize="s">
                  {jsx}
                </EuiCodeBlock>
              </EuiFlexItem>
            </EuiFlexGroup>

            {error && (
              <>
                <EuiSpacer size="m" />
                <EuiTitle size="xxs">
                  <h4>Error</h4>
                </EuiTitle>
                <EuiCodeBlock language="text" fontSize="s" paddingSize="s">
                  {error.message}
                </EuiCodeBlock>
              </>
            )}
          </>
        )}
      </EuiPanel>
    </>
  );
};
