/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Dispatch } from 'react';
import React, { useCallback, useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import type {
  EuiBasicTableColumn,
  CriteriaWithPagination,
  SearchFilterConfig,
  Direction,
  Query,
  Search,
} from '@elastic/eui';
import {
  EuiButton,
  EuiInMemoryTable,
  type EuiTableSelectionType,
  useEuiTheme,
  EuiCode,
  EuiText,
  EuiEmptyPrompt,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { UserContentCommonSchema } from '@kbn/content-management-table-list-view-common';
import {
  cssFavoriteHoverWithinEuiTableRow,
  useFavorites,
} from '@kbn/content-management-favorites-public';

import { useServices } from '../services';
import type { Action } from '../actions';
import type {
  State as TableListViewState,
  TableListViewTableProps,
} from '../table_list_view_table';
import type { TableItemsRowActions } from '../types';
import { TableSortSelect } from './table_sort_select';
import { TagFilterPanel, TagFilterContextProvider } from './tag_filter_panel';
import { useTagFilterPanel } from './use_tag_filter_panel';
import type { Params as UseTagFilterPanelParams } from './use_tag_filter_panel';
import type { CustomSortingOptions, SortColumnField } from './table_sort_select';
import {
  UserFilterPanel,
  UserFilterContextProvider,
  NULL_USER as USER_FILTER_NULL_USER,
} from './user_filter_panel';
import { FavoritesFilterButton } from './favorites_filter_panel';

import { TabbedTableFilter } from './tabbed_filter';

type State<T extends UserContentCommonSchema> = Pick<
  TableListViewState<T>,
  'items' | 'selectedIds' | 'searchQuery' | 'tableSort' | 'pagination' | 'tableFilter'
>;

type TagManagementProps = Pick<
  UseTagFilterPanelParams,
  'addOrRemoveIncludeTagFilter' | 'addOrRemoveExcludeTagFilter' | 'tagsToTableItemMap'
>;

export const FORBIDDEN_SEARCH_CHARS = '()[]{}<>+=\\"$#!¿?,;`\'/|&';

interface Props<T extends UserContentCommonSchema> extends State<T>, TagManagementProps {
  dispatch: Dispatch<Action<T>>;
  entityName: string;
  entityNamePlural: string;
  isFetchingItems: boolean;
  tableCaption: string;
  tableColumns: Array<EuiBasicTableColumn<T>>;
  hasUpdatedAtMetadata: boolean;
  hasRecentlyAccessedMetadata: boolean;
  customSortingOptions?: CustomSortingOptions;
  deleteItems: TableListViewTableProps<T>['deleteItems'];
  tableItemsRowActions: TableItemsRowActions;
  renderCreateButton: () => React.ReactElement | undefined;
  onSortChange: (column: SortColumnField, direction: Direction) => void;
  onTableChange: (criteria: CriteriaWithPagination<T>) => void;
  onFilterChange: (filter: Partial<State<T>['tableFilter']>) => void;
  onTableSearchChange: (arg: { query: Query | null; queryText: string }) => void;
  clearTagSelection: () => void;
  createdByEnabled: boolean;
  favoritesEnabled: boolean;
  contentTypeTabsEnabled?: boolean;
  emptyPrompt?: JSX.Element;
}

export function Table<T extends UserContentCommonSchema>({
  dispatch,
  items,
  isFetchingItems,
  searchQuery,
  selectedIds,
  pagination,
  tableColumns,
  tableSort,
  tableFilter,
  hasUpdatedAtMetadata,
  hasRecentlyAccessedMetadata,
  customSortingOptions,
  entityName,
  entityNamePlural,
  tagsToTableItemMap,
  tableItemsRowActions,
  deleteItems,
  renderCreateButton,
  tableCaption,
  onTableChange,
  onTableSearchChange,
  onSortChange,
  onFilterChange,
  addOrRemoveExcludeTagFilter,
  addOrRemoveIncludeTagFilter,
  clearTagSelection,
  createdByEnabled,
  favoritesEnabled,
  contentTypeTabsEnabled,
  emptyPrompt,
}: Props<T>) {
  const euiTheme = useEuiTheme();
  const { getTagList, isTaggingEnabled, isKibanaVersioningEnabled, navigateToUrl, getUrlForApp } =
    useServices();

  // Compute dynamic entity name plural based on active tab
  const dynamicEntityNamePlural = useMemo(() => {
    if (contentTypeTabsEnabled && tableFilter.contentTypeTab) {
      switch (tableFilter.contentTypeTab) {
        case 'dashboards':
          return 'dashboards';
        case 'visualizations':
          return 'visualizations';
        case 'annotation-groups':
          return 'annotation groups';
        default:
          return entityNamePlural;
      }
    }
    return entityNamePlural;
  }, [contentTypeTabsEnabled, tableFilter.contentTypeTab, entityNamePlural]);

  const renderToolsLeft = useCallback(() => {
    if (!deleteItems || selectedIds.length === 0) {
      return;
    }

    return (
      <EuiButton
        color="danger"
        iconType="trash"
        onClick={() => dispatch({ type: 'showConfirmDeleteItemsModal' })}
        data-test-subj="deleteSelectedItems"
      >
        <FormattedMessage
          id="contentManagement.tableList.listing.deleteButtonMessage"
          defaultMessage="Delete {itemCount} {entityName}"
          values={{
            itemCount: selectedIds.length,
            entityName: selectedIds.length === 1 ? entityName : dynamicEntityNamePlural,
          }}
        />
      </EuiButton>
    );
  }, [deleteItems, dispatch, entityName, dynamicEntityNamePlural, selectedIds.length]);

  // Dynamic create button for toolbar (changes based on active tab)
  const renderDynamicCreateButton = useCallback(() => {
    if (contentTypeTabsEnabled && tableFilter.contentTypeTab) {
      switch (tableFilter.contentTypeTab) {
        case 'visualizations':
          // For visualizations, open the visualization creation modal
          return (
            <EuiButton
              fill
              iconType="plusInCircle"
              onClick={async () => {
                const { showNewVisModal } = await import('@kbn/visualizations-plugin/public');
                showNewVisModal();
              }}
              data-test-subj="newItemButton"
            >
              <FormattedMessage
                id="contentManagement.tableList.listing.visualizations.createButtonToolbar"
                defaultMessage="Create visualization"
              />
            </EuiButton>
          );
        case 'annotation-groups':
          // For annotation groups, button navigates to Lens
          return (
            <EuiButton
              fill
              iconType="plusInCircle"
              onClick={() => {
                const lensUrl = getUrlForApp('lens', { path: '#/' });
                navigateToUrl(lensUrl);
              }}
              data-test-subj="createAnnotationInLensButton"
            >
              <FormattedMessage
                id="contentManagement.tableList.listing.annotationGroups.createButtonToolbar"
                defaultMessage="Create annotation in Lens"
              />
            </EuiButton>
          );
        default:
          // Dashboards - use the create button from parent
          return renderCreateButton();
      }
    }

    return renderCreateButton();
  }, [
    contentTypeTabsEnabled,
    tableFilter.contentTypeTab,
    renderCreateButton,
    navigateToUrl,
    getUrlForApp,
  ]);

  const selection = useMemo<EuiTableSelectionType<T> | undefined>(() => {
    if (deleteItems) {
      return {
        onSelectionChange: (obj: T[]) => {
          dispatch({ type: 'onSelectionChange', data: obj });
        },
        selectable: (obj) => {
          const actions = tableItemsRowActions[obj.id];
          return actions?.delete?.enabled !== false;
        },
        selectableMessage: (selectable, obj) => {
          if (!selectable) {
            const actions = tableItemsRowActions[obj.id];
            return (
              actions?.delete?.reason ??
              i18n.translate('contentManagement.tableList.actionsDisabledLabel', {
                defaultMessage: 'Actions disabled for this item',
              })
            );
          }
          return '';
        },
        initialSelected: [],
      };
    }
  }, [deleteItems, dispatch, tableItemsRowActions]);

  const {
    isPopoverOpen,
    closePopover,
    onFilterButtonClick,
    onSelectChange,
    options,
    totalActiveFilters,
  } = useTagFilterPanel({
    query: searchQuery.query,
    getTagList,
    tagsToTableItemMap,
    addOrRemoveExcludeTagFilter,
    addOrRemoveIncludeTagFilter,
  });

  const tableSortSelectFilter = useMemo<SearchFilterConfig>(() => {
    return {
      type: 'custom_component',
      component: () => {
        return (
          <TableSortSelect
            tableSort={tableSort}
            hasUpdatedAtMetadata={hasUpdatedAtMetadata}
            hasRecentlyAccessedMetadata={hasRecentlyAccessedMetadata}
            customSortingOptions={customSortingOptions}
            onChange={onSortChange}
          />
        );
      },
    };
  }, [
    hasUpdatedAtMetadata,
    onSortChange,
    tableSort,
    hasRecentlyAccessedMetadata,
    customSortingOptions,
  ]);

  const tagFilterPanel = useMemo<SearchFilterConfig | null>(() => {
    if (!isTaggingEnabled()) return null;

    return {
      type: 'custom_component',
      component: TagFilterPanel,
    };
  }, [isTaggingEnabled]);

  const userFilterPanel = useMemo<SearchFilterConfig | null>(() => {
    return createdByEnabled
      ? {
          type: 'custom_component',
          component: UserFilterPanel,
        }
      : null;
  }, [createdByEnabled]);

  const favoritesFilterButton = useMemo<SearchFilterConfig | null>(() => {
    if (!favoritesEnabled) return null;

    return {
      type: 'custom_component',
      component: () => {
        return (
          <FavoritesFilterButton
            isFavoritesOnly={tableFilter.favorites}
            onToggleFavorites={() => {
              onFilterChange({ favorites: !tableFilter.favorites });
            }}
          />
        );
      },
    };
  }, [favoritesEnabled, tableFilter.favorites, onFilterChange]);

  const searchFilters = useMemo(() => {
    return [tableSortSelectFilter, tagFilterPanel, userFilterPanel, favoritesFilterButton].filter(
      (f: SearchFilterConfig | null): f is SearchFilterConfig => Boolean(f)
    );
  }, [tableSortSelectFilter, tagFilterPanel, userFilterPanel, favoritesFilterButton]);

  const search = useMemo((): Search => {
    const showHint = !!searchQuery.error && searchQuery.error.containsForbiddenChars;
    return {
      onChange: onTableSearchChange,
      toolsLeft: renderToolsLeft(),
      toolsRight: renderDynamicCreateButton(),
      query: searchQuery.query ?? undefined,
      box: {
        incremental: true,
        'data-test-subj': 'tableListSearchBox',
      },
      filters: searchFilters,
      hint: {
        content: (
          <EuiText color="red" size="s" data-test-subj="forbiddenCharErrorMessage">
            <FormattedMessage
              id="contentManagement.tableList.listing.charsNotAllowedHint"
              defaultMessage="Characters not allowed: {chars}"
              values={{
                chars: <EuiCode>{FORBIDDEN_SEARCH_CHARS}</EuiCode>,
              }}
            />
          </EuiText>
        ),
        popoverProps: {
          isOpen: showHint,
        },
      },
    };
  }, [
    onTableSearchChange,
    renderDynamicCreateButton,
    renderToolsLeft,
    searchFilters,
    searchQuery.query,
    searchQuery.error,
  ]);

  // Simple message shown while loading
  const loadingMessage = useMemo(
    () => (
      <FormattedMessage
        id="contentManagement.tableList.listing.loadingMessage"
        defaultMessage="No {entityNamePlural} matched your search."
        values={{ entityNamePlural: dynamicEntityNamePlural }}
      />
    ),
    [dynamicEntityNamePlural]
  );

  const emptyPromptTitle = useMemo(
    () => (
      <FormattedMessage
        id="contentManagement.tableList.listing.noItemsTitle"
        defaultMessage="No {entityNamePlural} to display"
        values={{ entityNamePlural: dynamicEntityNamePlural }}
      />
    ),
    [dynamicEntityNamePlural]
  );

  const emptyPromptBody = useMemo(() => {
    if (contentTypeTabsEnabled && tableFilter.contentTypeTab) {
      switch (tableFilter.contentTypeTab) {
        case 'visualizations':
          return (
            <FormattedMessage
              id="contentManagement.tableList.listing.visualizations.noItemsBody"
              defaultMessage="Create a visualization to get started."
            />
          );
        case 'annotation-groups':
          return (
            <FormattedMessage
              id="contentManagement.tableList.listing.annotationGroups.noItemsBody"
              defaultMessage="Create and save annotations for use across multiple visualizations in the Lens editor."
            />
          );
        default:
          // Dashboards
          return (
            <FormattedMessage
              id="contentManagement.tableList.listing.dashboards.noItemsBody"
              defaultMessage="Create a dashboard to get started."
            />
          );
      }
    }

    return (
      <FormattedMessage
        id="contentManagement.tableList.listing.noItemsBody"
        defaultMessage="Create a new item to get started."
      />
    );
  }, [contentTypeTabsEnabled, tableFilter.contentTypeTab]);

  const emptyPromptActions = useMemo(() => {
    if (contentTypeTabsEnabled && tableFilter.contentTypeTab) {
      switch (tableFilter.contentTypeTab) {
        case 'visualizations':
          // For visualizations, open the visualization creation modal
          return (
            <EuiButton
              fill
              onClick={async () => {
                // Dynamically import showNewVisModal from visualizations plugin
                const { showNewVisModal } = await import('@kbn/visualizations-plugin/public');
                showNewVisModal();
              }}
              data-test-subj="newItemButton"
            >
              <FormattedMessage
                id="contentManagement.tableList.listing.visualizations.createButton"
                defaultMessage="Create visualization"
              />
            </EuiButton>
          );
        case 'annotation-groups':
          // For annotation groups, button navigates to Lens
          return (
            <EuiButton
              fill
              onClick={() => {
                const lensUrl = getUrlForApp('lens', { path: '#/' });
                navigateToUrl(lensUrl);
              }}
              data-test-subj="createAnnotationInLensButton"
            >
              <FormattedMessage
                id="contentManagement.tableList.listing.annotationGroups.createButton"
                defaultMessage="Create annotation in Lens"
              />
            </EuiButton>
          );
        default:
          // Dashboards - use the create button from parent
          return renderCreateButton();
      }
    }

    return renderCreateButton();
  }, [
    contentTypeTabsEnabled,
    tableFilter.contentTypeTab,
    renderCreateButton,
    navigateToUrl,
    getUrlForApp,
  ]);

  const { data: favorites, isError: favoritesError } = useFavorites({ enabled: favoritesEnabled });

  const visibleItems = React.useMemo(() => {
    let filteredItems = items;

    // Filter by content type tab
    if (contentTypeTabsEnabled && tableFilter?.contentTypeTab) {
      const currentTab = tableFilter.contentTypeTab;
      filteredItems = filteredItems.filter((item) => {
        const itemType = (item as any).type;
        if (currentTab === 'dashboards') {
          return itemType === 'dashboard' || !itemType; // Default to dashboard if no type
        } else if (currentTab === 'visualizations') {
          return itemType === 'visualization' || itemType === 'map';
        } else if (currentTab === 'annotation-groups') {
          return itemType === 'event-annotation-group';
        }
        return true;
      });
    }

    if (tableFilter?.createdBy?.length > 0) {
      filteredItems = filteredItems.filter((item) => {
        if (item.createdBy) return tableFilter.createdBy.includes(item.createdBy);
        else if (item.managed) return false;
        else return tableFilter.createdBy.includes(USER_FILTER_NULL_USER);
      });
    }

    if (tableFilter?.favorites && !favoritesError) {
      if (!favorites) {
        filteredItems = [];
      } else {
        filteredItems = filteredItems.filter((item) => favorites.favoriteIds.includes(item.id));
      }
    }

    return filteredItems;
  }, [items, tableFilter, favorites, favoritesError, contentTypeTabsEnabled]);

  const { allUsers, showNoUserOption } = useMemo(() => {
    if (!createdByEnabled) return { allUsers: [], showNoUserOption: false };

    let _showNoUserOption = false;
    const users = new Set<string>();
    items.forEach((item) => {
      if (item.createdBy) {
        users.add(item.createdBy);
      } else if (!item.managed) {
        // show no user option only if there is an item without createdBy that is not a "managed" item
        _showNoUserOption = true;
      }
    });
    return { allUsers: Array.from(users), showNoUserOption: _showNoUserOption };
  }, [createdByEnabled, items]);

  const sorting =
    tableSort.field === 'accessedAt' // "accessedAt" is a special case with a custom sorting
      ? true // by passing "true" we disable the EuiInMemoryTable sorting and handle it ourselves, but sorting is still enabled
      : { sort: tableSort };

  const tabbedFilter = contentTypeTabsEnabled ? (
    <TabbedTableFilter
      selectedTabId={tableFilter.contentTypeTab ?? 'dashboards'}
      onSelectedTabChanged={(newTab) => {
        onFilterChange({ contentTypeTab: newTab });
      }}
    />
  ) : undefined;

  // Show search/filters for all tabs (annotation-groups now behaves like other tabs)
  const showSearch = true;

  return (
    <>
      {tabbedFilter}
      <UserFilterContextProvider
        enabled={createdByEnabled}
        allUsers={allUsers}
        onSelectedUsersChange={(selectedUsers) => {
          onFilterChange({ createdBy: selectedUsers });
        }}
        selectedUsers={tableFilter.createdBy}
        showNoUserOption={showNoUserOption}
        isKibanaVersioningEnabled={isKibanaVersioningEnabled}
        entityNamePlural={dynamicEntityNamePlural}
      >
        <TagFilterContextProvider
          isPopoverOpen={isPopoverOpen}
          closePopover={closePopover}
          onFilterButtonClick={onFilterButtonClick}
          onSelectChange={onSelectChange}
          options={options}
          totalActiveFilters={totalActiveFilters}
          clearTagSelection={clearTagSelection}
        >
          <EuiInMemoryTable<T>
            itemId="id"
            items={visibleItems}
            columns={tableColumns}
            pagination={pagination}
            loading={isFetchingItems}
            noItemsMessage={
              isFetchingItems ? (
                // Show simple message while loading
                loadingMessage
              ) : (
                // Show full empty prompt when confirmed no items
                <EuiEmptyPrompt
                  title={<h3>{emptyPromptTitle}</h3>}
                  titleSize="xs"
                  body={emptyPromptBody}
                  actions={emptyPromptActions}
                />
              )
            }
            selection={selection}
            search={showSearch ? search : false}
            executeQueryOptions={{ enabled: false }}
            sorting={sorting}
            onChange={onTableChange}
            data-test-subj="itemsInMemTable"
            rowHeader="attributes.title"
            tableCaption={tableCaption}
            css={cssFavoriteHoverWithinEuiTableRow(euiTheme.euiTheme)}
          />
        </TagFilterContextProvider>
      </UserFilterContextProvider>
    </>
  );
}
