/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { debounce } from 'lodash';
import PropTypes from 'prop-types';
import React from 'react';
import type { SavedObjectsManagementPluginStart } from '@kbn/saved-objects-management-plugin/public';

import {
  EuiInMemoryTable,
  EuiLink,
  EuiTableFieldDataColumnType,
  IconType,
  EuiIcon,
  EuiToolTip,
  EuiSearchBarProps,
  SearchFilterConfig,
  Query,
  PropertySort,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import type { IUiSettingsClient, HttpStart } from '@kbn/core/public';
import type { SavedObjectsTaggingApi } from '@kbn/saved-objects-tagging-oss-plugin/public';
import { LISTING_LIMIT_SETTING } from '@kbn/saved-objects-plugin/public';
import { SavedObjectCommon, FindQueryHTTP, FindResponseHTTP, FinderAttributes } from '../../common';

export interface SavedObjectMetaData<T = unknown> {
  type: string;
  name: string;
  getIconForSavedObject(savedObject: SavedObjectCommon<T>): IconType;
  getTooltipForSavedObject?(savedObject: SavedObjectCommon<T>): string;
  showSavedObject?(savedObject: SavedObjectCommon<T>): boolean;
  getSavedObjectSubType?(savedObject: SavedObjectCommon<T>): string;
  includeFields?: string[];
  defaultSearchField?: string;
}

interface SavedObjectFinderItem extends SavedObjectCommon {
  title: string | null;
  name: string | null;
  simple: SavedObjectCommon<FinderAttributes>;
}

interface SavedObjectFinderState {
  items: SavedObjectFinderItem[];
  query: Query;
  isFetchingItems: boolean;
  sort?: PropertySort;
}

interface SavedObjectFinderServices {
  http: HttpStart;
  uiSettings: IUiSettingsClient;
  savedObjectsManagement: SavedObjectsManagementPluginStart;
  savedObjectsTagging?: SavedObjectsTaggingApi;
}

interface BaseSavedObjectFinder {
  services: SavedObjectFinderServices;
  onChoose?: (
    id: SavedObjectCommon['id'],
    type: SavedObjectCommon['type'],
    name: string,
    savedObject: SavedObjectCommon
  ) => void;
  noItemsMessage?: React.ReactNode;
  savedObjectMetaData: Array<SavedObjectMetaData<FinderAttributes>>;
  showFilter?: boolean;
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

export class SavedObjectFinderUi extends React.Component<
  SavedObjectFinderProps,
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

  private debouncedFetch = debounce(async (query: Query) => {
    const metaDataMap = this.getSavedObjectMetaDataMap();
    const { savedObjectsManagement, uiSettings, http } = this.props.services;

    const fields = Object.values(metaDataMap)
      .map((metaData) => metaData.includeFields || [])
      .reduce((allFields, currentFields) => allFields.concat(currentFields), ['title', 'name']);

    const additionalSearchFields = Object.values(metaDataMap).reduce<string[]>((col, item) => {
      if (item.defaultSearchField) {
        col.push(item.defaultSearchField);
      }
      return col;
    }, []);

    const perPage = uiSettings.get(LISTING_LIMIT_SETTING);
    const { queryText, visibleTypes, selectedTags } = savedObjectsManagement.parseQuery(
      query,
      Object.values(metaDataMap).map((metadata) => ({
        name: metadata.type,
        namespaceType: 'single',
        hidden: false,
        displayName: metadata.name,
      }))
    );
    const hasReference = savedObjectsManagement.getTagFindReferences({
      selectedTags,
      taggingApi: this.props.services.savedObjectsTagging,
    });
    const params: FindQueryHTTP = {
      type: visibleTypes ?? Object.keys(metaDataMap),
      search: queryText ? `${queryText}*` : undefined,
      fields: [...new Set(fields)],
      page: 1,
      perPage,
      searchFields: ['title^3', 'description', ...additionalSearchFields],
      defaultSearchOperator: 'AND',
      hasReference: hasReference ? JSON.stringify(hasReference) : undefined,
    };

    const response = (await http.get('/internal/saved-objects-finder/find', {
      query: params as Record<string, any>,
    })) as FindResponseHTTP<FinderAttributes>;

    const savedObjects = response.saved_objects
      .map((savedObject) => {
        const {
          attributes: { name, title },
        } = savedObject;
        const titleToUse = typeof title === 'string' ? title : '';
        const nameToUse = name ? name : titleToUse;
        return {
          ...savedObject,
          version: savedObject.version,
          title: titleToUse,
          name: nameToUse,
          simple: savedObject,
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

  constructor(props: SavedObjectFinderProps) {
    super(props);

    this.state = {
      items: [],
      isFetchingItems: false,
      query: Query.parse(''),
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

  public render() {
    const { onChoose, savedObjectMetaData } = this.props;
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
            width: '50px',
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
                } as Pick<SavedObjectMetaData<{ title: string }>, 'getIconForSavedObject'>)
              ).getIconForSavedObject(item.simple);

              return (
                <EuiToolTip position="top" content={currentSavedObjectMetaData.name}>
                  <EuiIcon
                    aria-label={currentSavedObjectMetaData.name}
                    type={iconType}
                    size="s"
                    data-test-subj="objectType"
                  />
                </EuiToolTip>
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

          return (
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
        },
      },
      ...(tagColumn ? [tagColumn] : []),
    ];
    const pagination = {
      initialPageSize: this.props.initialPageSize || this.props.fixedPageSize || 10,
      pageSizeOptions: [5, 10, 15, 25],
      showPerPageOptions: !this.props.fixedPageSize,
    };
    const sorting = {
      sort: this.state.sort ?? {
        field: this.state.query?.text ? '' : 'title',
        direction: 'asc',
      },
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
      },
      filters: this.props.showFilter
        ? [
            ...(savedObjectMetaData.length > 1 ? [typeFilter] : []),
            ...(taggingApi ? [taggingApi.ui.getSearchBarFilter({ useName: true })] : []),
          ]
        : undefined,
      toolsRight: this.props.children ? <>{this.props.children}</> : undefined,
    };

    return (
      <EuiInMemoryTable
        loading={this.state.isFetchingItems}
        itemId="id"
        items={this.state.items}
        columns={columns}
        data-test-subj="savedObjectsFinderTable"
        message={this.props.noItemsMessage}
        search={search}
        pagination={pagination}
        sorting={sorting}
        onTableChange={({ sort }) => {
          this.setState({ sort });
        }}
      />
    );
  }
}

// Needed for React.lazy
// eslint-disable-next-line import/no-default-export
export default SavedObjectFinderUi;
