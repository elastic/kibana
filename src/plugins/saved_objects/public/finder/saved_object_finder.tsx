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
import { SavedObjectManagementTypeInfo } from '@kbn/saved-objects-management-plugin/public';

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
} from '@elastic/eui';
import { Direction } from '@elastic/eui/src/services/sort/sort_direction';
import { i18n } from '@kbn/i18n';

import {
  SimpleSavedObject,
  CoreStart,
  IUiSettingsClient,
  SavedObjectsStart,
  SavedObject,
} from '@kbn/core/public';

import { LISTING_LIMIT_SETTING } from '../../common';
import { getSavedObjects } from '../services';

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
  query: string;
  isFetchingItems: boolean;
  page: number;
  perPage: number;
  sortDirection?: Direction;
  sortOpen: boolean;
  filterOpen: boolean;
  filteredTypes: string[];
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

export type SavedObjectFinderUiProps = {
  savedObjects: CoreStart['savedObjects'];
  uiSettings: CoreStart['uiSettings'];
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

  private debouncedFetch = debounce(async (query: string) => {
    const metaDataMap = this.getSavedObjectMetaDataMap();

    const fields = Object.values(metaDataMap)
      .map((metaData) => metaData.includeFields || [])
      .reduce((allFields, currentFields) => allFields.concat(currentFields), ['title', 'name']);

    const additionalSearchFields = Object.values(metaDataMap).reduce<string[]>((col, item) => {
      if (item.defaultSearchField) {
        col.push(item.defaultSearchField);
      }
      return col;
    }, []);

    const perPage = this.props.uiSettings.get(LISTING_LIMIT_SETTING);
    const originalSavedObjects = await getSavedObjects().savedObjectsClient.find<FinderAttributes>({
      type: Object.keys(metaDataMap),
      fields: [...new Set(fields)],
      search: query ? `${query}*` : undefined,
      perPage,
      searchFields: ['title^3', 'description', ...additionalSearchFields],
    });

    const savedObjects = originalSavedObjects
      .map((savedObject) => {
        const {
          attributes: { name, title },
        } = savedObject;
        const titleToUse = typeof title === 'string' ? title : '';
        const nameToUse = name && typeof name === 'string' ? name : titleToUse;
        return {
          ...savedObject,
          title: titleToUse,
          name: nameToUse,
          simple: new SimpleSavedObject(this.props.savedObjects.client, savedObject),
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
    if (query === this.state.query) {
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
      query: '',
      filterOpen: false,
      filteredTypes: [],
      sortOpen: false,
      allowedTypes: [],
    };
  }

  public componentWillUnmount() {
    this.isComponentMounted = false;
    this.debouncedFetch.cancel();
  }

  public componentDidMount() {
    this.isComponentMounted = true;
    this.fetchItems();
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
    const allowedTypes = await getSavedObjects().getAllowedTypes();
    this.setState({ allowedTypes });
  };

  // server-side paging not supported
  // 1) saved object client does not support sorting by title because title is only mapped as analyzed
  // 2) can not search on anything other than title because all other fields are stored in opaque JSON strings,
  //    for example, visualizations need to be search by isLab but this is not possible in Elasticsearch side
  //    with the current mappings
  public render() {
    const { onChoose, savedObjectMetaData } = this.props;
    const taggingApi = getSavedObjects().getSavedObjectsTagging();
    const columns: Array<EuiTableFieldDataColumnType<SavedObjectFinderItem>> = [
      {
        field: 'type',
        name: i18n.translate('savedObjects.finder.typeName', {
          defaultMessage: 'Type',
        }),
        width: '50px',
        align: 'center',
        description: i18n.translate('savedObjects.finder.typeDescription', {
          defaultMessage: 'Type of the saved object',
        }),
        sortable: true,
        'data-test-subj': 'savedObjectFinderType',
        render: (type, item) => {
          const typeLabel = getSavedObjects().getSavedObjectLabel(type, this.state.allowedTypes);
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
        name: i18n.translate('savedObjects.finder.titleName', {
          defaultMessage: 'Title',
        }),
        description: i18n.translate('savedObjects.finder.titleDescription', {
          defaultMessage: 'Title of the saved object',
        }),
        dataType: 'string',
        sortable: true,
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
      ...(taggingApi ? [taggingApi.ui.getTableColumnDefinition()] : []),
    ];
    const pagination = {
      pageIndex: this.state.page,
      pageSize: this.state.perPage,
      totalItemCount: this.state.items.length,
      pageSizeOptions: [5, 10, 20, 50],
      showPerPageOptions: !Boolean(this.props.fixedPageSize),
    };
    const typeFilter: SearchFilterConfig = {
      type: 'field_value_selection',
      field: 'type',
      name: i18n.translate('savedObjects.finder.filterButtonLabel', {
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
        this.setState({ query: query?.text ?? '' }, this.fetchItems);
      },
      box: {
        incremental: true,
      },
      filters: [
        ...(this.props.showFilter ? [typeFilter] : []),
        ...(taggingApi ? [taggingApi.ui.getSearchBarFilter({ useName: true })] : []),
      ],
      toolsRight: this.props.children ? <>{this.props.children}</> : undefined,
    };

    return (
      <EuiInMemoryTable
        loading={
          (this.state.isFetchingItems && this.state.items.length === 0) ||
          !this.state.allowedTypes.length
        }
        itemId="id"
        items={this.state.items}
        columns={columns}
        message={this.props.noItemsMessage}
        search={search}
        pagination={pagination}
        sorting={true}
        onChange={(table: CriteriaWithPagination<SavedObjectFinderItem>) => {
          const { index: page, size: perPage } = table.page || {};

          this.setState({
            page,
            perPage,
          });
        }}
      />
    );
  }
}

const getSavedObjectFinder = (savedObject: SavedObjectsStart, uiSettings: IUiSettingsClient) => {
  return (props: SavedObjectFinderProps) => (
    <SavedObjectFinderUi {...props} savedObjects={savedObject} uiSettings={uiSettings} />
  );
};

export { getSavedObjectFinder, SavedObjectFinderUi };
