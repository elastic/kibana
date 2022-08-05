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
import {
  SavedObjectManagementTypeInfo,
  SavedObjectsManagementPluginStart,
} from '@kbn/saved-objects-management-plugin/public';

import {
  EuiInMemoryTable,
  EuiLink,
  EuiTableFieldDataColumnType,
  IconType,
  EuiIcon,
  EuiToolTip,
  CriteriaWithPagination,
  EuiSearchBarProps,
  SearchFilterConfig,
  Query,
  PropertySort,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import {
  SimpleSavedObject,
  CoreStart,
  IUiSettingsClient,
  SavedObjectsStart,
  SavedObject,
} from '@kbn/core/public';
import { SavedObjectsStart as SavedObjectsPlugin } from '@kbn/saved-objects-plugin/public/plugin';
import {
  SavedObjectsTaggingApi,
  SavedObjectTaggingOssPluginStart,
} from '@kbn/saved-objects-tagging-oss-plugin/public';

export interface SavedObjectMetaData<T = unknown> {
  type: string;
  name: string;
  getIconForSavedObject(savedObject: SimpleSavedObject<T>): IconType;
  getTooltipForSavedObject?(savedObject: SimpleSavedObject<T>): string;
  showSavedObject?(savedObject: SimpleSavedObject<T>): boolean;
  getSavedObjectSubType?(savedObject: SimpleSavedObject<T>): string;
  includeFields?: string[];
  defaultSearchField?: string;
}

interface FinderAttributes {
  title?: string;
  name?: string;
  type: string;
}

interface SavedObjectFinderItem extends SavedObject {
  title: string | null;
  name: string | null;
  simple: SimpleSavedObject<FinderAttributes>;
}

interface SavedObjectFinderState {
  items: SavedObjectFinderItem[];
  query: Query;
  isFetchingItems: boolean;
  page: number;
  perPage: number;
  sort?: PropertySort;
  allowedTypes: SavedObjectManagementTypeInfo[];
}

interface BaseSavedObjectFinder {
  onChoose?: (
    id: SimpleSavedObject['id'],
    type: SimpleSavedObject['type'],
    name: string,
    savedObject: SimpleSavedObject
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

type SavedObjectFinderUiProps = {
  savedObjects: CoreStart['savedObjects'];
  uiSettings: CoreStart['uiSettings'];
  savedObjectsManagement: SavedObjectsManagementPluginStart;
  savedObjectsPlugin: SavedObjectsPlugin;
  savedObjectsTagging: SavedObjectsTaggingApi | undefined;
} & SavedObjectFinderProps;

class SavedObjectFinderUi extends React.Component<
  SavedObjectFinderUiProps,
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
    const { queryText, visibleTypes, selectedTags } = this.props.savedObjectsManagement.parseQuery(
      query,
      this.state.allowedTypes
    );

    const fields = Object.values(metaDataMap)
      .map((metaData) => metaData.includeFields || [])
      .reduce((allFields, currentFields) => allFields.concat(currentFields), ['title', 'name']);

    const searchTypes = Object.keys(metaDataMap).filter(
      (type) => !visibleTypes || visibleTypes.includes(type)
    );

    const perPage = this.props.savedObjectsPlugin.settings.getListingLimit();
    const additionalSearchFields = Object.values(metaDataMap).reduce<string[]>((col, item) => {
      if (item.defaultSearchField) {
        col.push(item.defaultSearchField);
      }
      return col;
    }, []);

    const response = await this.props.savedObjects.client.find<FinderAttributes>({
      type: searchTypes,
      fields: [...new Set(fields)],
      search: queryText ? `${queryText}*` : undefined,
      page: 1,
      perPage,
      searchFields: ['title^3', 'description', ...additionalSearchFields],
      defaultSearchOperator: 'AND',
      hasReference: this.props.savedObjectsManagement.getTagFindReferences({
        selectedTags,
        taggingApi: this.props.savedObjectsTagging,
      }),
    });

    const savedObjects = response.savedObjects
      .map((savedObject) => {
        const {
          attributes: { name, title },
        } = savedObject;
        const titleToUse = typeof title === 'string' ? title : '';
        const nameToUse = name && typeof name === 'string' ? name : titleToUse;
        return {
          ...savedObject,
          version: savedObject._version,
          title: titleToUse,
          name: nameToUse,
          simple: savedObject,
        };
      })
      .filter((savedObject) => {
        const metaData = metaDataMap[savedObject.type];
        if (metaData.showSavedObject) {
          return metaData.showSavedObject(savedObject.simple);
        } else {
          return true;
        }
      });

    if (!this.isComponentMounted) {
      return;
    }

    // We need this check to handle the case where search results come back in a different
    // order than they were sent out. Only load results for the most recent search.
    if (query.text === this.state.query.text) {
      this.setState({
        isFetchingItems: false,
        page: 0,
        items: savedObjects,
      });
    }
  }, 300);

  constructor(props: SavedObjectFinderUiProps) {
    super(props);

    this.state = {
      items: [],
      isFetchingItems: false,
      page: 0,
      perPage: props.initialPageSize || props.fixedPageSize || 10,
      query: Query.parse(''),
      allowedTypes: [],
    };
  }

  public componentWillUnmount() {
    this.isComponentMounted = false;
    this.debouncedFetch.cancel();
  }

  public componentDidMount() {
    this.isComponentMounted = true;
    this.fetchAllowedTypes();
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

  private fetchAllowedTypes = async () => {
    const allowedTypes = await this.props.savedObjectsManagement.getAllowedTypes();
    this.setState({ allowedTypes }, this.fetchItems);
  };

  // server-side paging not supported
  // 1) saved object client does not support sorting by title because title is only mapped as analyzed
  // 2) can not search on anything other than title because all other fields are stored in opaque JSON strings,
  //    for example, visualizations need to be search by isLab but this is not possible in Elasticsearch side
  //    with the current mappings
  public render() {
    const { onChoose, savedObjectMetaData } = this.props;
    const taggingApi = this.props.savedObjectsTagging;
    const originalTagColumn = taggingApi?.ui.getTableColumnDefinition();
    const tagColumn: EuiTableFieldDataColumnType<SavedObject> | undefined = originalTagColumn
      ? {
          ...originalTagColumn,
          sortable: (item) =>
            typeof originalTagColumn.sortable === 'function'
              ? originalTagColumn.sortable(item) ?? ''
              : '',
        }
      : undefined;
    const columns: Array<EuiTableFieldDataColumnType<SavedObjectFinderItem>> = [
      {
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
          return this.props.savedObjectsManagement.getSavedObjectLabel(
            type,
            this.state.allowedTypes
          );
        },
        'data-test-subj': 'savedObjectFinderType',
        render: (type, item) => {
          const typeLabel = this.props.savedObjectsManagement.getSavedObjectLabel(
            type,
            this.state.allowedTypes
          );
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
            <EuiToolTip position="top" content={typeLabel}>
              <EuiIcon
                aria-label={typeLabel}
                type={iconType}
                size="s"
                data-test-subj="objectType"
              />
            </EuiToolTip>
          );
        },
      },
      {
        field: 'title',
        name: i18n.translate('savedObjectsFinder.titleName', {
          defaultMessage: 'Title',
        }),
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
      pageIndex: this.state.page,
      pageSize: this.state.perPage,
      totalItemCount: this.state.items.length,
      pageSizeOptions: [5, 10, 20, 50],
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
      },
      filters: [
        ...(this.props.showFilter ? [typeFilter] : []),
        ...(taggingApi ? [taggingApi.ui.getSearchBarFilter({ useName: true })] : []),
      ],
      toolsRight: this.props.children ? <>{this.props.children}</> : undefined,
      'data-test-subj': 'savedObjectFinderSearchInput',
    };

    return (
      <EuiInMemoryTable
        loading={this.state.isFetchingItems || !this.state.allowedTypes.length}
        itemId="id"
        items={this.state.allowedTypes.length ? this.state.items : []}
        columns={columns}
        message={this.props.noItemsMessage}
        search={search}
        pagination={pagination}
        sorting={this.state.sort ? { sort: this.state.sort } : true}
        onChange={(table: CriteriaWithPagination<SavedObjectFinderItem>) => {
          const { index: page, size: perPage } = table.page || {};

          this.setState({
            page,
            perPage,
            sort: table.sort,
          });
        }}
      />
    );
  }
}

const getSavedObjectFinder = (
  savedObject: SavedObjectsStart,
  uiSettings: IUiSettingsClient,
  savedObjectsManagement: SavedObjectsManagementPluginStart,
  savedObjectsPlugin: SavedObjectsPlugin,
  savedObjectsTagging: SavedObjectTaggingOssPluginStart | undefined
) => {
  return (props: SavedObjectFinderProps) => (
    <SavedObjectFinderUi
      {...props}
      savedObjects={savedObject}
      uiSettings={uiSettings}
      savedObjectsManagement={savedObjectsManagement}
      savedObjectsPlugin={savedObjectsPlugin}
      savedObjectsTagging={savedObjectsTagging?.getTaggingApi()}
    />
  );
};

export { getSavedObjectFinder, SavedObjectFinderUi };
