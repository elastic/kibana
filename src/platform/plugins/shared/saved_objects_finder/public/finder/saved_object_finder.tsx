/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { debounce } from 'lodash';
import PropTypes from 'prop-types';
import type { ReactElement, ReactNode } from 'react';
import React from 'react';
import { getTagFindReferences, parseQuery } from '@kbn/saved-objects-management-plugin/public';
import type { ContentClient } from '@kbn/content-management-plugin/public';
import type { IUiSettingsClient } from '@kbn/core/public';

import type {
  EuiSearchBarProps,
  EuiTableFieldDataColumnType,
  IconType,
  SearchFilterConfig,
} from '@elastic/eui';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiInMemoryTable,
  EuiLink,
  EuiText,
  EuiToolTip,
  EuiIconTip,
  EuiTabs,
  EuiTab,
  EuiSpacer,
  Query,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import type { SavedObjectsTaggingApi } from '@kbn/saved-objects-tagging-oss-plugin/public';
import {
  withEuiTablePersist,
  type EuiTablePersistInjectedProps,
} from '@kbn/shared-ux-table-persist/src';

import type { FinderAttributes, SavedObjectCommon } from '../../common';
import { LISTING_LIMIT_SETTING } from '../../common';
// Import our FavoriteStarButton component
import { FavoriteStarButton, cssFavoriteHoverWithinTable } from '../../../../../../plugins/favorites_poc/public/components/favorite_star_button';
import { css } from '@emotion/react';

const PAGE_SIZE_OPTIONS = [5, 10, 15, 25];

export interface SavedObjectMetaData<T extends FinderAttributes = FinderAttributes> {
  type: string;
  name: string;
  getIconForSavedObject(savedObject: SavedObjectCommon<T>): IconType;
  getTooltipForSavedObject?(savedObject: SavedObjectCommon<T>): string;
  showSavedObject?(savedObject: SavedObjectCommon<T>): boolean;
  getSavedObjectSubType?(savedObject: SavedObjectCommon<T>): string;
  /** @deprecated doesn't do anything, the full object is returned **/
  includeFields?: string[];
}

export interface SavedObjectFinderItem extends SavedObjectCommon {
  title: string | null;
  name: string | null;
  simple: SavedObjectCommon<FinderAttributes>;
}

interface SavedObjectFinderState {
  items: SavedObjectFinderItem[];
  query: Query;
  isFetchingItems: boolean;
  selectedTabId: 'all' | 'starred';
  starredIds: string[];
  isLoadingStarred: boolean;
}

interface SavedObjectFinderServices {
  savedObjectsTagging?: SavedObjectsTaggingApi;
  contentClient: ContentClient;
  uiSettings: IUiSettingsClient;
}

interface BaseSavedObjectFinder {
  id: string;
  services: SavedObjectFinderServices;
  onChoose?: (
    id: SavedObjectCommon['id'],
    type: SavedObjectCommon['type'],
    name: string,
    savedObject: SavedObjectCommon
  ) => void;
  noItemsMessage?: ReactNode;
  savedObjectMetaData: Array<SavedObjectMetaData<FinderAttributes>>;
  showFilter?: boolean;
  leftChildren?: ReactElement | ReactElement[];
  children?: ReactElement | ReactElement[];
  helpText?: string;
  getTooltipText?: (item: SavedObjectFinderItem) => string | undefined;
  /** Optional favorites service to enable star buttons */
  favoritesService?: any; // Using 'any' for now to avoid import issues
  /** Show tabbed UI with All/Starred tabs. Defaults to true. */
  showTabbedUI?: boolean;
}

interface SavedObjectFinderFixedPage extends BaseSavedObjectFinder {
  initialPageSize?: undefined;
  fixedPageSize: number;
}

interface SavedObjectFinderInitialPageSize extends BaseSavedObjectFinder {
  initialPageSize?: 5 | 10 | 15 | 25;
  fixedPageSize?: undefined;
}

export type SavedObjectFinderProps = SavedObjectFinderFixedPage | SavedObjectFinderInitialPageSize;

class SavedObjectFinderUiClass extends React.Component<
  SavedObjectFinderProps & EuiTablePersistInjectedProps<SavedObjectFinderItem>,
  SavedObjectFinderState
> {
  public static propTypes = {
    onChoose: PropTypes.func,
    noItemsMessage: PropTypes.node,
    savedObjectMetaData: PropTypes.array.isRequired,
    initialPageSize: PropTypes.oneOf([5, 10, 15, 25]),
    fixedPageSize: PropTypes.number,
    showFilter: PropTypes.bool,
  };
  private isComponentMounted: boolean = false;

  // Get the EUI theme for hover CSS
  private getEuiTheme() {
    // This is a workaround since we can't use hooks in class components
    // We'll use a default theme object
    return {
      animation: { fast: '150ms', resistance: 'cubic-bezier(0.694, 0, 0.335, 1)' }
    };
  }

  private debouncedFetch = debounce(async (query: Query) => {
    const metaDataMap = this.getSavedObjectMetaDataMap();
    const { contentClient, uiSettings } = this.props.services;

    const { queryText, visibleTypes, selectedTags } = parseQuery(
      query,
      Object.values(metaDataMap).map((metadata) => ({
        name: metadata.type,
        namespaceType: 'single',
        hidden: false,
        displayName: metadata.name,
      }))
    );
    const includeTags = getTagFindReferences({
      selectedTags,
      taggingApi: this.props.services.savedObjectsTagging,
    })?.map(({ id, type }) => id);

    const types = visibleTypes ?? Object.keys(metaDataMap);

    const response = await contentClient.mSearch<SavedObjectCommon<FinderAttributes>>({
      contentTypes: types.map((type) => ({ contentTypeId: type })),
      query: {
        text: queryText ? `${queryText}*` : undefined,
        ...(includeTags?.length ? { tags: { included: includeTags } } : {}),
        limit: uiSettings.get(LISTING_LIMIT_SETTING), // TODO: support pagination,
      },
    });

    const savedObjects = response.hits
      .map((savedObject) => {
        const {
          attributes: { name, title, description },
        } = savedObject;
        const titleToUse = typeof title === 'string' ? title : '';
        const nameToUse = name ? name : titleToUse;
        return {
          ...savedObject,
          version: savedObject.version,
          title: titleToUse,
          name: nameToUse,
          simple: savedObject,
          description,
        };
      })
      .filter((savedObject) => {
        const metaData = metaDataMap[savedObject.type];
        if (metaData.showSavedObject) {
          return metaData.showSavedObject(savedObject.simple);
        }
        return true;
      });

    if (!this.isComponentMounted) {
      return;
    }

    // We need this check to handle the case where search results come back in a different
    // order than they were sent out. Only load results for the most recent search.
    if (query.text === this.state.query.text) {
      this.setState({
        isFetchingItems: false,
        items: savedObjects,
      });
    }
  }, 300);

  constructor(props: SavedObjectFinderProps & EuiTablePersistInjectedProps<SavedObjectFinderItem>) {
    super(props);

    this.state = {
      items: [],
      isFetchingItems: false,
      query: Query.parse(''),
      selectedTabId: 'all',
      starredIds: [],
      isLoadingStarred: false,
    };
  }

  public componentWillUnmount() {
    this.isComponentMounted = false;
    this.debouncedFetch.cancel();
  }

  public componentDidMount() {
    this.isComponentMounted = true;
    this.fetchItems();
  }

  private getSavedObjectMetaDataMap(): Record<string, SavedObjectMetaData> {
    return this.props.savedObjectMetaData.reduce(
      (map, metaData) => ({ ...map, [metaData.type]: metaData }),
      {}
    );
  }

  private fetchItems = () => {
    this.setState(
      {
        isFetchingItems: true,
      },
      this.debouncedFetch.bind(null, this.state.query)
    );
  };

  private handleTabChange = (tabId: 'all' | 'starred') => {
    if (tabId === 'all') {
      this.setState({ 
        selectedTabId: tabId,
        starredIds: []
      });
    } else {
      this.setState({ 
        selectedTabId: tabId
      });
    }
  };

  private refreshStarredItems = () => {
    if (this.props.favoritesService) {
      this.setState({ isLoadingStarred: true });
      this.props.favoritesService.getFavorites()
        .then((response: any) => {
          this.setState({ 
            starredIds: response.favoriteIds || [],
            isLoadingStarred: false 
          });
        })
        .catch((error: any) => {
          // Silently handle refresh errors - user can retry by switching tabs
          this.setState({ 
            starredIds: [],
            isLoadingStarred: false 
          });
        });
    }
  };

  public render() {
    const {
      onChoose,
      savedObjectMetaData,
      showTabbedUI = true, // Default to true
      euiTablePersist: { pageSize, sorting, onTableChange },
    } = this.props;
    const taggingApi = this.props.services.savedObjectsTagging;
    const originalTagColumn = taggingApi?.ui.getTableColumnDefinition();
    const tagColumn: EuiTableFieldDataColumnType<SavedObjectCommon> | undefined = originalTagColumn
      ? {
          ...originalTagColumn,
          sortable: (item) =>
            typeof originalTagColumn.sortable === 'function'
              ? originalTagColumn.sortable(item) ?? ''
              : '',
          ['data-test-subj']: 'savedObjectFinderTags',
        }
      : undefined;
    const typeColumn: EuiTableFieldDataColumnType<SavedObjectFinderItem> | undefined =
      savedObjectMetaData.length > 1
        ? {
            field: 'type',
            name: i18n.translate('savedObjectsFinder.typeName', {
              defaultMessage: 'Type',
            }),
            width: '70px',
            align: 'center',
            description: i18n.translate('savedObjectsFinder.typeDescription', {
              defaultMessage: 'Type of the saved object',
            }),
            sortable: ({ type }) => {
              const currentSavedObjectMetaData = savedObjectMetaData.find(
                (metaData) => metaData.type === type
              );

              return currentSavedObjectMetaData?.name ?? '';
            },
            'data-test-subj': 'savedObjectFinderType',
            render: (_, item) => {
              const currentSavedObjectMetaData = savedObjectMetaData.find(
                (metaData) => metaData.type === item.type
              )!;
              const iconType = (
                currentSavedObjectMetaData ||
                ({
                  getIconForSavedObject: () => 'document',
                } as Pick<SavedObjectMetaData, 'getIconForSavedObject'>)
              ).getIconForSavedObject(item.simple);

              return (
                <EuiIconTip
                  position="top"
                  content={currentSavedObjectMetaData.name}
                  aria-label={currentSavedObjectMetaData.name}
                  type={iconType}
                  size="s"
                  data-test-subj="objectType"
                />
              );
            },
          }
        : undefined;
    const columns: Array<EuiTableFieldDataColumnType<SavedObjectFinderItem>> = [
      ...(typeColumn ? [typeColumn] : []),
      {
        field: 'title',
        name: i18n.translate('savedObjectsFinder.titleName', {
          defaultMessage: 'Title',
        }),
        width: tagColumn ? '55%' : '100%',
        description: i18n.translate('savedObjectsFinder.titleDescription', {
          defaultMessage: 'Title of the saved object',
        }),
        dataType: 'string',
        sortable: ({ name }) => name?.toLowerCase(),
        'data-test-subj': 'savedObjectFinderTitle',
        render: (_, item) => {
          const currentSavedObjectMetaData = savedObjectMetaData.find(
            (metaData) => metaData.type === item.type
          )!;
          const fullName = currentSavedObjectMetaData.getTooltipForSavedObject
            ? currentSavedObjectMetaData.getTooltipForSavedObject(item.simple)
            : `${item.name} (${currentSavedObjectMetaData!.name})`;

          const tooltipText = this.props.getTooltipText?.(item);
          const description = !!item.simple.attributes.description && (
            <EuiText size="xs" color="subdued">
              {item.simple.attributes.description}
            </EuiText>
          );

          // Render title with star button inline (matching Dashboard ItemDetails pattern)
          const renderTitle = () => {
            const link = (
              <EuiLink
                onClick={
                  onChoose
                    ? () => {
                        onChoose(item.id, item.type, fullName, item.simple);
                      }
                    : undefined
                }
                title={fullName}
                data-test-subj={`savedObjectTitle${(item.title || '').split(' ').join('-')}`}
              >
                {item.name}
              </EuiLink>
            );

            // Add star button if favorites service is provided
            const starButton = this.props.favoritesService ? (
              <FavoriteStarButton
                type={item.type}
                id={item.id}
                favoritesService={this.props.favoritesService}
                onFavoriteChange={(isFavorite) => {
                  // If we're on the starred tab and an item was unfavorited, refresh the starred list
                  if (this.state.selectedTabId === 'starred' && !isFavorite) {
                    this.refreshStarredItems();
                  }
                }}
                alwaysShow={false} // Let component handle visibility based on favorite status
                className="favorite-star-button--empty"
              />
            ) : null;

            return tooltipText ? (
              <EuiFlexGroup alignItems="center" gutterSize="s">
                <EuiFlexItem grow={false}>
                  <EuiToolTip position="left" content={tooltipText}>
                    {link}
                  </EuiToolTip>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>{starButton}</EuiFlexItem>
              </EuiFlexGroup>
            ) : (
              <EuiFlexGroup alignItems="center" gutterSize="s">
                <EuiFlexItem grow={false}>{link}</EuiFlexItem>
                <EuiFlexItem grow={false}>{starButton}</EuiFlexItem>
              </EuiFlexGroup>
            );
          };

          return (
            <div>
              <EuiText size="s">{renderTitle()}</EuiText>
              {description}
            </div>
          );
        },
      },
      ...(tagColumn ? [tagColumn] : []),
    ];
    const pagination = {
      initialPageSize: !!this.props.fixedPageSize ? this.props.fixedPageSize : pageSize ?? 10,
      pageSize: !!this.props.fixedPageSize ? undefined : pageSize,
      pageSizeOptions: PAGE_SIZE_OPTIONS,
      showPerPageOptions: !this.props.fixedPageSize,
    };
    const typeFilter: SearchFilterConfig = {
      type: 'field_value_selection',
      field: 'type',
      name: i18n.translate('savedObjectsFinder.filterButtonLabel', {
        defaultMessage: 'Types',
      }),
      multiSelect: 'or',
      options: this.props.savedObjectMetaData.map((metaData) => ({
        value: metaData.type,
        name: metaData.name,
      })),
    };
    const search: EuiSearchBarProps = {
      onChange: ({ query }) => {
        this.setState({ query: query ?? Query.parse('') }, this.fetchItems);
      },
      box: {
        incremental: true,
        'data-test-subj': 'savedObjectFinderSearchInput',
        autoFocus: true,
        inputRef: (node) => {
          requestAnimationFrame(() => {
            // preventing focus loss on the second rendering of the flyout
            // which seems to steal focus from the input
            node?.focus({ preventScroll: true });
          });
        },
        schema: {
          recognizedFields: ['type', 'tag'],
        },
      },
      filters: this.props.showFilter
        ? [
            ...(savedObjectMetaData.length > 1 ? [typeFilter] : []),
            ...(taggingApi ? [taggingApi.ui.getSearchBarFilter({ useName: true })] : []),
          ]
        : undefined,
      toolsRight: this.props.children ? <>{this.props.children}</> : undefined,
      toolsLeft: this.props.leftChildren ? <>{this.props.leftChildren}</> : undefined,
    };

    // Fetch starred IDs when switching to starred tab
    if (showTabbedUI && this.state.selectedTabId === 'starred' && this.props.favoritesService && !this.state.isLoadingStarred && this.state.starredIds.length === 0) {
      this.refreshStarredItems();
    }

    // Filter items based on selected tab
    const filteredItems = showTabbedUI && this.state.selectedTabId === 'starred'
      ? this.state.items.filter((item) => this.state.starredIds.includes(item.id))
      : this.state.items;

    // Render tabs if showTabbedUI is true
    const renderTabs = () => {
      if (!this.props.showTabbedUI) return null;

      return (
        <>
          <EuiTabs
            data-test-subj="savedObjectFinderTabs"
            style={{
              marginTop: '-8px',
            }}
          >
            <EuiTab
              onClick={() => this.handleTabChange('all')}
              isSelected={this.state.selectedTabId === 'all'}
              data-test-subj="allTab"
            >
              <FormattedMessage
                id="savedObjectsFinder.tabs.allTabLabel"
                defaultMessage="All"
              />
            </EuiTab>
            <EuiTab
              onClick={() => this.handleTabChange('starred')}
              isSelected={this.state.selectedTabId === 'starred'}
              data-test-subj="starredTab"
            >
              <FormattedMessage
                id="savedObjectsFinder.tabs.starredTabLabel"
                defaultMessage="Starred"
              />
            </EuiTab>
          </EuiTabs>
          <EuiSpacer size="s" />
        </>
      );
    };

    return (
      <EuiFlexGroup direction="column">
        {this.props.helpText ? (
          <EuiFlexItem>
            <EuiText size="s" color="subdued">
              {this.props.helpText}
            </EuiText>
          </EuiFlexItem>
        ) : undefined}
        {renderTabs()}
        <EuiFlexItem>
          <EuiInMemoryTable
            loading={this.state.isFetchingItems}
            itemId="id"
            items={filteredItems}
            columns={columns}
            data-test-subj="savedObjectsFinderTable"
            message={this.props.noItemsMessage}
            search={search}
            pagination={pagination}
            sorting={!!this.state.query?.text ? undefined : sorting}
            onTableChange={onTableChange}
            css={cssFavoriteHoverWithinTable(this.getEuiTheme())}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
}

export const SavedObjectFinderUi = withEuiTablePersist(SavedObjectFinderUiClass, {
  get: (props) => ({
    tableId: `soFinder-${props.id}`,
    pageSizeOptions: PAGE_SIZE_OPTIONS,
    initialPageSize: props.initialPageSize ?? props.fixedPageSize ?? 10,
  }),
});

export const SavedObjectFinderWithoutPersist = SavedObjectFinderUiClass; // For testing

// Needed for React.lazy
// eslint-disable-next-line import/no-default-export
export default SavedObjectFinderUi;
