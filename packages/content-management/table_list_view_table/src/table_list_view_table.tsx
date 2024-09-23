/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useReducer, useCallback, useEffect, useRef, useMemo } from 'react';
import useDebounce from 'react-use/lib/useDebounce';
import {
  EuiBasicTableColumn,
  EuiButton,
  EuiCallOut,
  EuiEmptyPrompt,
  Pagination,
  Direction,
  EuiSpacer,
  EuiTableActionsColumnType,
  CriteriaWithPagination,
  Query,
  Ast,
} from '@elastic/eui';
import { keyBy, uniq, get } from 'lodash';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { IHttpFetchError } from '@kbn/core-http-browser';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { useOpenContentEditor } from '@kbn/content-management-content-editor';
import {
  UserAvatarTip,
  ManagedAvatarTip,
  NoCreatorTip,
} from '@kbn/content-management-user-profiles';
import type {
  OpenContentEditorParams,
  SavedObjectsReference,
} from '@kbn/content-management-content-editor';
import type { UserContentCommonSchema } from '@kbn/content-management-table-list-view-common';
import type { RecentlyAccessed } from '@kbn/recently-accessed';
import {
  ContentInsightsProvider,
  useContentInsightsServices,
} from '@kbn/content-management-content-insights-public';

import {
  Table,
  ConfirmDeleteModal,
  ListingLimitWarning,
  ItemDetails,
  UpdatedAtField,
} from './components';
import { useServices } from './services';
import type { SavedObjectsFindOptionsReference } from './services';
import { getReducer } from './reducer';
import { type SortColumnField, getInitialSorting, saveSorting } from './components';
import { useTags } from './use_tags';
import { useInRouterContext, useUrlState } from './use_url_state';
import { RowActions, TableItemsRowActions } from './types';
import { sortByRecentlyAccessed } from './components/table_sort_select';
import { ContentEditorActivityRow } from './components/content_editor_activity_row';

interface ContentEditorConfig
  extends Pick<OpenContentEditorParams, 'isReadonly' | 'onSave' | 'customValidators'> {
  enabled?: boolean;
}

export interface TableListViewTableProps<
  T extends UserContentCommonSchema = UserContentCommonSchema
> {
  entityName: string;
  entityNamePlural: string;
  listingLimit: number;
  initialFilter?: string;
  initialPageSize: number;
  emptyPrompt?: JSX.Element;
  /** Add an additional custom column */
  customTableColumn?: EuiBasicTableColumn<T>;
  urlStateEnabled?: boolean;
  createdByEnabled?: boolean;
  /**
   * Id of the heading element describing the table. This id will be used as `aria-labelledby` of the wrapper element.
   * If the table is not empty, this component renders its own h1 element using the same id.
   */
  headingId?: string;
  /** An optional id for the listing. Used to generate unique data-test-subj. Default: "userContent" */
  id?: string;
  /**
   * Configuration of the table row item actions. Disable specific action for a table row item.
   * Currently only the "delete" ite action can be disabled.
   */
  rowItemActions?: (obj: T) => RowActions | undefined;
  findItems(
    searchQuery: string,
    refs?: {
      references?: SavedObjectsFindOptionsReference[];
      referencesToExclude?: SavedObjectsFindOptionsReference[];
    }
  ): Promise<{ total: number; hits: T[] }>;
  /** Handler to set the item title "href" value. If it returns undefined there won't be a link for this item. */
  getDetailViewLink?: (entity: T) => string | undefined;
  /** Handler to execute when clicking the item title */
  getOnClickTitle?: (item: T) => (() => void) | undefined;
  createItem?(): void;
  deleteItems?(items: T[]): Promise<void>;
  /**
   * Edit action onClick handler. Edit action not provided when property is not provided
   */
  editItem?(item: T): void;

  /**
   * Name for the column containing the "title" value.
   */
  titleColumnName?: string;

  /**
   * This assumes the content is already wrapped in an outer PageTemplate component.
   * @note Hack! This is being used as a workaround so that this page can be rendered in the Kibana management UI
   * @deprecated
   */
  withoutPageTemplateWrapper?: boolean;
  contentEditor?: ContentEditorConfig;
  recentlyAccessed?: Pick<RecentlyAccessed, 'get'>;

  tableCaption: string;
  /** Flag to force a new fetch of the table items. Whenever it changes, the `findItems()` will be called. */
  refreshListBouncer?: boolean;
  onFetchSuccess: () => void;
  setPageDataTestSubject: (subject: string) => void;
}

export interface State<T extends UserContentCommonSchema = UserContentCommonSchema> {
  items: T[];
  /**
   * Flag to indicate if there aren't any item when **no filteres are applied**.
   * When there are no item we render an empty prompt.
   * Default to `undefined` to indicate that we don't know yet if there are items or not.
   */
  hasNoItems: boolean | undefined;
  hasInitialFetchReturned: boolean;
  isFetchingItems: boolean;
  isDeletingItems: boolean;
  showDeleteModal: boolean;
  fetchError?: IHttpFetchError<Error>;
  searchQuery: {
    text: string;
    query: Query;
  };
  selectedIds: string[];
  totalItems: number;
  hasUpdatedAtMetadata: boolean;
  hasCreatedByMetadata: boolean;
  hasRecentlyAccessedMetadata: boolean;
  pagination: Pagination;
  tableSort: {
    field: SortColumnField;
    direction: Direction;
  };
  sortColumnChanged: boolean;
  tableFilter: {
    createdBy: string[];
    favorites: boolean;
  };
}

export interface URLState {
  s?: string;
  sort?: {
    field: SortColumnField;
    direction: Direction;
  };
  filter?: {
    createdBy?: string[];
    favorites?: boolean;
  };

  [key: string]: unknown;
}

interface URLQueryParams {
  s?: string;
  title?: string;
  sort?: string;
  sortdir?: string;
  created_by?: string[];
  favorites?: 'true';

  [key: string]: unknown;
}

/**
 * Deserializer to convert the URL query params to a sanitized object
 * we can rely on in this component.
 *
 * @param params The URL query params
 * @returns The URLState sanitized
 */
const urlStateDeserializer = (params: URLQueryParams): URLState => {
  const stateFromURL: URLState = {};
  const sanitizedParams = { ...params };

  // If we declare 2 or more query params with the same key in the URL
  // we will receive an array of value back when parsed. It is probably
  // a mistake from the user so we'll sanitize the data before continuing.
  ['s', 'title', 'sort', 'sortdir'].forEach((key: string) => {
    if (Array.isArray(sanitizedParams[key])) {
      sanitizedParams[key] = (sanitizedParams[key] as string[])[0];
    }
  });

  // For backward compability with the Dashboard app we will support both "s" and "title" passed
  // in the query params. We might want to stop supporting both in a future release (v9.0?)
  stateFromURL.s = sanitizedParams.s ?? sanitizedParams.title;

  if (
    sanitizedParams.sort === 'title' ||
    sanitizedParams.sort === 'updatedAt' ||
    sanitizedParams.sort === 'accessedAt'
  ) {
    const field =
      sanitizedParams.sort === 'title'
        ? 'attributes.title'
        : sanitizedParams.sort === 'accessedAt'
        ? 'accessedAt'
        : 'updatedAt';

    stateFromURL.sort = { field, direction: field === 'attributes.title' ? 'asc' : 'desc' };

    if (sanitizedParams.sortdir === 'desc' || sanitizedParams.sortdir === 'asc') {
      stateFromURL.sort.direction = sanitizedParams.sortdir;
    }
  }

  if (sanitizedParams.created_by) {
    stateFromURL.filter = {
      createdBy: Array.isArray(sanitizedParams.created_by)
        ? sanitizedParams.created_by
        : [sanitizedParams.created_by],
    };
  } else {
    stateFromURL.filter = { createdBy: [] };
  }

  if (sanitizedParams.favorites === 'true') {
    stateFromURL.filter.favorites = true;
  } else {
    stateFromURL.filter.favorites = false;
  }

  return stateFromURL;
};

/**
 * Serializer to convert the updated state of the component into query params in the URL
 *
 * @param updated The updated state of our component that we want to persist in the URL
 * @returns The query params (flatten object) to update the URL
 */
const urlStateSerializer = (updated: {
  s?: string;
  sort?: { field: 'title' | 'updatedAt'; direction: Direction };
  filter?: { createdBy?: string[]; favorites?: boolean };
}) => {
  const updatedQueryParams: Partial<URLQueryParams> = {};

  if (updated.sort) {
    updatedQueryParams.sort = updated.sort.field;
    updatedQueryParams.sortdir = updated.sort.direction;
  }

  if (updated.s !== undefined) {
    updatedQueryParams.s = updated.s;
    updatedQueryParams.title = undefined;
  }

  if (typeof updatedQueryParams.s === 'string' && updatedQueryParams.s.trim() === '') {
    updatedQueryParams.s = undefined;
    updatedQueryParams.title = undefined;
  }

  if (updated.filter?.createdBy) {
    updatedQueryParams.created_by = updated.filter.createdBy;
  }

  if (updated?.filter && 'favorites' in updated.filter) {
    updatedQueryParams.favorites = updated.filter.favorites ? 'true' : undefined;
  }

  return updatedQueryParams;
};

const tableColumnMetadata = {
  title: {
    field: 'attributes.title',
    name: 'Name, description, tags',
  },
  updatedAt: {
    field: 'updatedAt',
    name: 'Last updated',
  },
  createdBy: {
    field: 'createdBy',
    name: 'Creator',
  },
} as const;

function TableListViewTableComp<T extends UserContentCommonSchema>({
  tableCaption,
  entityName,
  entityNamePlural,
  initialFilter: initialQuery,
  headingId,
  initialPageSize,
  listingLimit,
  urlStateEnabled = false,
  customTableColumn,
  emptyPrompt,
  rowItemActions,
  findItems,
  createItem,
  editItem,
  deleteItems,
  getDetailViewLink,
  getOnClickTitle,
  id: listingId = 'userContent',
  contentEditor = { enabled: false },
  titleColumnName,
  withoutPageTemplateWrapper,
  onFetchSuccess,
  refreshListBouncer,
  setPageDataTestSubject,
  createdByEnabled = false,
  recentlyAccessed,
}: TableListViewTableProps<T>) {
  useEffect(() => {
    setPageDataTestSubject(`${entityName}LandingPage`);
  }, [entityName, setPageDataTestSubject]);

  if (!getDetailViewLink && !getOnClickTitle) {
    throw new Error(
      `[TableListView] One o["getDetailViewLink" or "getOnClickTitle"] prop must be provided.`
    );
  }

  if (contentEditor.isReadonly === false && contentEditor.onSave === undefined) {
    throw new Error(
      `[TableListView] A value for [contentEditor.onSave()] must be provided when [contentEditor.isReadonly] is false.`
    );
  }

  const isMounted = useRef(false);
  const fetchIdx = useRef(0);

  /**
   * The "onTableSearchChange()" handler has an async behavior. We want to be able to discard
   * previsous search changes and only handle the last one. For that we keep a counter of the changes.
   */
  const tableSearchChangeIdx = useRef(0);
  /**
   * We want to build the initial query
   */
  const initialQueryInitialized = useRef(false);

  const {
    canEditAdvancedSettings,
    getListingLimitSettingsUrl,
    getTagIdsFromReferences,
    searchQueryParser,
    notifyError,
    DateFormatterComp,
    getTagList,
    isFavoritesEnabled,
  } = useServices();

  const openContentEditor = useOpenContentEditor();
  const contentInsightsServices = useContentInsightsServices();

  const isInRouterContext = useInRouterContext();

  if (!isInRouterContext) {
    throw new Error(
      `<TableListView/> requires a React Router context. Ensure your component or React root is being rendered in the context of a <Router>.`
    );
  }

  const [urlState, setUrlState] = useUrlState<URLState, URLQueryParams>({
    queryParamsDeserializer: urlStateDeserializer,
    queryParamsSerializer: urlStateSerializer,
  });

  const reducer = useMemo(() => {
    return getReducer<T>();
  }, []);

  const initialState = useMemo<State<T>>(() => {
    const initialSort = getInitialSorting(entityName);
    return {
      items: [],
      hasNoItems: undefined,
      totalItems: 0,
      hasInitialFetchReturned: false,
      isFetchingItems: true,
      isDeletingItems: false,
      showDeleteModal: false,
      hasUpdatedAtMetadata: false,
      hasCreatedByMetadata: false,
      hasRecentlyAccessedMetadata: recentlyAccessed ? recentlyAccessed.get().length > 0 : false,
      selectedIds: [],
      searchQuery: { text: '', query: new Query(Ast.create([]), undefined, '') },
      pagination: {
        pageIndex: 0,
        totalItemCount: 0,
        pageSize: initialPageSize,
        pageSizeOptions: uniq([10, 20, 50, initialPageSize]).sort(),
      },
      tableSort: initialSort.tableSort,
      sortColumnChanged: !initialSort.isDefault,
      tableFilter: {
        createdBy: [],
        favorites: false,
      },
    };
  }, [initialPageSize, entityName, recentlyAccessed]);

  const [state, dispatch] = useReducer(reducer, initialState);

  const {
    searchQuery,
    hasInitialFetchReturned,
    isFetchingItems,
    items,
    hasNoItems,
    fetchError,
    showDeleteModal,
    isDeletingItems,
    selectedIds,
    totalItems,
    hasUpdatedAtMetadata,
    hasCreatedByMetadata,
    hasRecentlyAccessedMetadata,
    pagination,
    tableSort,
    tableFilter,
  } = state;

  const showFetchError = Boolean(fetchError);
  const showLimitError = !showFetchError && totalItems > listingLimit;

  const fetchItems = useCallback(async () => {
    dispatch({ type: 'onFetchItems' });

    try {
      const idx = ++fetchIdx.current;

      const {
        searchQuery: searchQueryParsed,
        references,
        referencesToExclude,
      } = searchQueryParser
        ? await searchQueryParser(searchQuery.text)
        : { searchQuery: searchQuery.text, references: undefined, referencesToExclude: undefined };

      const response = await findItems(searchQueryParsed, { references, referencesToExclude });

      if (!isMounted.current) {
        return;
      }

      if (idx === fetchIdx.current) {
        // when recentlyAccessed is available, we sort the items by the recently accessed items
        // then this sort will be used as the default sort for the table
        if (recentlyAccessed && recentlyAccessed.get().length > 0) {
          response.hits = sortByRecentlyAccessed(response.hits, recentlyAccessed.get());
        }

        dispatch({
          type: 'onFetchItemsSuccess',
          data: {
            response,
          },
        });

        onFetchSuccess();
      }
    } catch (err) {
      dispatch({
        type: 'onFetchItemsError',
        data: err,
      });
    }
  }, [searchQueryParser, searchQuery.text, findItems, onFetchSuccess, recentlyAccessed]);

  const updateQuery = useCallback(
    (query: Query) => {
      if (urlStateEnabled) {
        setUrlState({ s: query.text });
        return;
      }

      dispatch({
        type: 'onSearchQueryChange',
        data: { query, text: query.text },
      });
    },
    [urlStateEnabled, setUrlState]
  );

  const {
    addOrRemoveIncludeTagFilter,
    addOrRemoveExcludeTagFilter,
    clearTagSelection,
    tagsToTableItemMap,
  } = useTags({
    query: searchQuery.query,
    updateQuery,
    items,
  });

  const tableItemsRowActions = useMemo(() => {
    return items.reduce<TableItemsRowActions>((acc, item) => {
      const ret = {
        ...acc,
        [item.id]: rowItemActions ? rowItemActions(item) : undefined,
      };

      if (item.managed) {
        ret[item.id] = {
          edit: {
            enabled: false,
            reason: i18n.translate('contentManagement.tableList.managedItemNoEdit', {
              defaultMessage: 'Elastic manages this item. Clone it to make changes.',
            }),
          },
          ...ret[item.id],
        };
      }

      return ret;
    }, {});
  }, [items, rowItemActions]);

  const inspectItem = useCallback(
    (item: T) => {
      const tags = getTagIdsFromReferences(item.references).map((_id) => {
        return item.references.find(({ id: refId }) => refId === _id) as SavedObjectsReference;
      });

      const close = openContentEditor({
        item: {
          id: item.id,
          title: item.attributes.title,
          description: item.attributes.description,
          tags,
          createdAt: item.createdAt,
          createdBy: item.createdBy,
          updatedAt: item.updatedAt,
          updatedBy: item.updatedBy,
          managed: item.managed,
        },
        entityName,
        ...contentEditor,
        isReadonly:
          contentEditor.isReadonly || tableItemsRowActions[item.id]?.edit?.enabled === false,
        readonlyReason: tableItemsRowActions[item.id]?.edit?.reason,
        onSave:
          contentEditor.onSave &&
          (async (args) => {
            await contentEditor.onSave!(args);
            await fetchItems();

            close();
          }),
        appendRows: contentInsightsServices && (
          // have to "REWRAP" in the provider here because it will be rendered in a different context
          <ContentInsightsProvider {...contentInsightsServices}>
            <ContentEditorActivityRow item={item} />
          </ContentInsightsProvider>
        ),
      });
    },
    [
      getTagIdsFromReferences,
      openContentEditor,
      entityName,
      contentEditor,
      tableItemsRowActions,
      fetchItems,
      contentInsightsServices,
    ]
  );

  const tableColumns = useMemo(() => {
    const columns: Array<EuiBasicTableColumn<T>> = [
      {
        field: tableColumnMetadata.title.field,
        name:
          titleColumnName ??
          i18n.translate('contentManagement.tableList.mainColumnName', {
            defaultMessage: 'Name, description, tags',
          }),
        sortable: true,
        render: (field: keyof T, record: T) => {
          return (
            <ItemDetails<T>
              id={listingId}
              item={record}
              getDetailViewLink={getDetailViewLink}
              getOnClickTitle={getOnClickTitle}
              onClickTag={(tag, withModifierKey) => {
                if (withModifierKey) {
                  addOrRemoveExcludeTagFilter(tag);
                } else {
                  addOrRemoveIncludeTagFilter(tag);
                }
              }}
              searchTerm={searchQuery.text}
              isFavoritesEnabled={isFavoritesEnabled()}
            />
          );
        },
      },
    ];

    if (customTableColumn) {
      columns.push(customTableColumn);
    }

    if (hasCreatedByMetadata && createdByEnabled) {
      columns.push({
        field: tableColumnMetadata.createdBy.field,
        name: (
          <>
            {i18n.translate('contentManagement.tableList.createdByColumnTitle', {
              defaultMessage: 'Creator',
            })}
          </>
        ),
        render: (field: string, record: { createdBy?: string; managed?: boolean }) =>
          record.createdBy ? (
            <UserAvatarTip uid={record.createdBy} />
          ) : record.managed ? (
            <ManagedAvatarTip entityName={entityName} />
          ) : (
            <NoCreatorTip iconType={'minus'} />
          ),
        sortable:
          false /* createdBy column is not sortable because it doesn't make sense to sort by id*/,
        width: '100px',
        align: 'center',
      });
    }

    if (hasUpdatedAtMetadata) {
      columns.push({
        field: tableColumnMetadata.updatedAt.field,
        name: i18n.translate('contentManagement.tableList.lastUpdatedColumnTitle', {
          defaultMessage: 'Last updated',
        }),
        render: (field: string, record: { updatedAt?: string }) => (
          <UpdatedAtField dateTime={record.updatedAt} DateFormatterComp={DateFormatterComp} />
        ),
        sortable: true,
        width: '130px',
      });
    }

    // Add "Actions" column
    if (editItem || contentEditor.enabled !== false) {
      const actions: EuiTableActionsColumnType<T>['actions'] = [];

      if (editItem) {
        actions.push({
          name: (item) => {
            return i18n.translate('contentManagement.tableList.listing.table.editActionName', {
              defaultMessage: 'Edit {itemDescription}',
              values: {
                itemDescription: get(item, 'attributes.title'),
              },
            });
          },
          description: i18n.translate(
            'contentManagement.tableList.listing.table.editActionDescription',
            {
              defaultMessage: 'Edit',
            }
          ),
          icon: 'pencil',
          type: 'icon',
          available: (item) => Boolean(tableItemsRowActions[item.id]?.edit?.enabled),
          enabled: (v) => !(v as unknown as { error: string })?.error,
          onClick: editItem,
          'data-test-subj': `edit-action`,
        });
      }

      if (contentEditor.enabled !== false) {
        actions.push({
          name: (item) => {
            return i18n.translate(
              'contentManagement.tableList.listing.table.viewDetailsActionName',
              {
                defaultMessage: 'View {itemTitle} details',
                values: {
                  itemTitle: get(item, 'attributes.title'),
                },
              }
            );
          },
          description: i18n.translate(
            'contentManagement.tableList.listing.table.viewDetailsActionDescription',
            {
              defaultMessage: 'View details',
            }
          ),
          icon: 'iInCircle',
          type: 'icon',
          onClick: inspectItem,
          'data-test-subj': `inspect-action`,
        });
      }

      columns.push({
        name: i18n.translate('contentManagement.tableList.listing.table.actionTitle', {
          defaultMessage: 'Actions',
        }),
        width: `72px`,
        actions,
      });
    }

    return columns;
  }, [
    titleColumnName,
    customTableColumn,
    hasUpdatedAtMetadata,
    hasCreatedByMetadata,
    createdByEnabled,
    editItem,
    contentEditor.enabled,
    listingId,
    getDetailViewLink,
    getOnClickTitle,
    searchQuery.text,
    addOrRemoveExcludeTagFilter,
    addOrRemoveIncludeTagFilter,
    DateFormatterComp,
    tableItemsRowActions,
    inspectItem,
    entityName,
    isFavoritesEnabled,
  ]);

  const itemsById = useMemo(() => {
    return keyBy(items, 'id');
  }, [items]);

  const selectedItems = useMemo(() => {
    return selectedIds.map((selectedId) => itemsById[selectedId]);
  }, [selectedIds, itemsById]);

  // ------------
  // Callbacks
  // ------------
  const buildQueryFromText = useCallback(
    async (text: string) => {
      let ast = Ast.create([]);
      let termMatch = text;

      if (searchQueryParser) {
        // Parse possible tags in the search text
        const {
          references,
          referencesToExclude,
          searchQuery: searchTerm,
        } = await searchQueryParser(text);

        termMatch = searchTerm;

        if (references?.length || referencesToExclude?.length) {
          const allTags = getTagList();

          if (references?.length) {
            references.forEach(({ id: refId }) => {
              const tag = allTags.find(({ id }) => id === refId);
              if (tag) {
                ast = ast.addOrFieldValue('tag', tag.name, true, 'eq');
              }
            });
          }

          if (referencesToExclude?.length) {
            referencesToExclude.forEach(({ id: refId }) => {
              const tag = allTags.find(({ id }) => id === refId);
              if (tag) {
                ast = ast.addOrFieldValue('tag', tag.name, false, 'eq');
              }
            });
          }
        }
      }

      if (termMatch.trim() !== '') {
        ast = ast.addClause({ type: 'term', value: termMatch, match: 'must' });
      }

      return new Query(ast, undefined, text);
    },
    [getTagList, searchQueryParser]
  );

  const onTableSearchChange = useCallback(
    (arg: { query: Query | null; queryText: string }) => {
      if (arg.query) {
        updateQuery(arg.query);
      } else {
        const idx = tableSearchChangeIdx.current + 1;
        buildQueryFromText(arg.queryText).then((query) => {
          if (idx === tableSearchChangeIdx.current) {
            updateQuery(query);
          }
        });
      }
    },
    [updateQuery, buildQueryFromText]
  );

  const updateTableSortFilterAndPagination = useCallback(
    (data: {
      sort?: State<T>['tableSort'];
      page?: {
        pageIndex: number;
        pageSize: number;
      };
      filter?: Partial<State<T>['tableFilter']>;
    }) => {
      if (data.sort && urlStateEnabled) {
        setUrlState({
          sort: {
            field: data.sort.field === 'attributes.title' ? 'title' : data.sort.field,
            direction: data.sort.direction,
          },
        });
      }

      if (data.filter && urlStateEnabled) {
        setUrlState({
          filter: data.filter,
        });
      }

      if (data.page || !urlStateEnabled) {
        dispatch({
          type: 'onTableChange',
          data,
        });
      }
    },
    [setUrlState, urlStateEnabled]
  );

  const onSortChange = useCallback(
    (field: SortColumnField, direction: Direction) => {
      const sort = {
        field,
        direction,
      };
      // persist the sorting changes caused by explicit user's interaction
      saveSorting(entityName, sort);

      updateTableSortFilterAndPagination({
        sort,
      });
    },
    [entityName, updateTableSortFilterAndPagination]
  );

  const onFilterChange = useCallback(
    (filter: Partial<State['tableFilter']>) => {
      updateTableSortFilterAndPagination({
        filter,
      });
    },
    [updateTableSortFilterAndPagination]
  );

  const onTableChange = useCallback(
    (criteria: CriteriaWithPagination<T>) => {
      const data: {
        sort?: State<T>['tableSort'];
        page?: {
          pageIndex: number;
          pageSize: number;
        };
      } = {};

      if (criteria.sort) {
        // We need to serialise the field as the <EuiInMemoryTable /> return either (1) the field _name_ (e.g. "Last updated")
        // when changing the "Rows per page" select value or (2) the field _value_ (e.g. "updatedAt") when clicking the column title
        let fieldSerialized: unknown = criteria.sort.field;
        if (fieldSerialized === tableColumnMetadata.title.name) {
          fieldSerialized = tableColumnMetadata.title.field;
        } else if (fieldSerialized === tableColumnMetadata.updatedAt.name) {
          fieldSerialized = tableColumnMetadata.updatedAt.field;
        }

        data.sort = {
          field: fieldSerialized as SortColumnField,
          direction: criteria.sort.direction,
        };

        // persist the sorting changes caused by explicit user's interaction
        saveSorting(entityName, data.sort);
      }

      data.page = {
        pageIndex: criteria.page.index,
        pageSize: criteria.page.size,
      };

      updateTableSortFilterAndPagination(data);
    },
    [updateTableSortFilterAndPagination, entityName]
  );

  const deleteSelectedItems = useCallback(async () => {
    if (isDeletingItems) {
      return;
    }

    dispatch({ type: 'onDeleteItems' });

    try {
      await deleteItems!(selectedItems);
    } catch (error) {
      notifyError(
        <FormattedMessage
          id="contentManagement.tableList.listing.unableToDeleteDangerMessage"
          defaultMessage="Unable to delete {entityName}(s)"
          values={{ entityName }}
        />,
        error
      );
    }

    fetchItems();

    dispatch({ type: 'onItemsDeleted' });
  }, [deleteItems, entityName, fetchItems, isDeletingItems, notifyError, selectedItems]);

  const renderCreateButton = useCallback(() => {
    if (createItem) {
      return (
        <EuiButton
          onClick={createItem}
          data-test-subj="newItemButton"
          iconType="plusInCircleFilled"
          fill
        >
          <FormattedMessage
            id="contentManagement.tableList.listing.createNewItemButtonLabel"
            defaultMessage="Create {entityName}"
            values={{ entityName }}
          />
        </EuiButton>
      );
    }
  }, [createItem, entityName]);

  const renderNoItemsMessage = useCallback(() => {
    if (emptyPrompt) {
      return emptyPrompt;
    } else {
      return (
        <EuiEmptyPrompt
          title={
            <h1>
              {
                <FormattedMessage
                  id="contentManagement.tableList.listing.noAvailableItemsMessage"
                  defaultMessage="No {entityNamePlural} available."
                  values={{ entityNamePlural }}
                />
              }
            </h1>
          }
          actions={renderCreateButton()}
        />
      );
    }
  }, [emptyPrompt, entityNamePlural, renderCreateButton]);

  const renderFetchError = useCallback(() => {
    return (
      <React.Fragment>
        <EuiCallOut
          title={
            <FormattedMessage
              id="contentManagement.tableList.listing.fetchErrorTitle"
              defaultMessage="Fetching listing failed"
            />
          }
          color="danger"
          iconType="warning"
        >
          <p>
            <FormattedMessage
              id="contentManagement.tableList.listing.fetchErrorDescription"
              defaultMessage="The {entityName} listing could not be fetched: {message}."
              values={{
                entityName,
                message: fetchError!.body?.message || fetchError!.message,
              }}
            />
          </p>
        </EuiCallOut>
        <EuiSpacer size="m" />
      </React.Fragment>
    );
  }, [entityName, fetchError]);

  // ------------
  // Effects
  // ------------
  useDebounce(fetchItems, 300, [fetchItems, refreshListBouncer]);

  useEffect(() => {
    if (!urlStateEnabled) {
      return;
    }

    // Update our Query instance based on the URL "s" text
    const updateQueryFromURL = async (text: string = '') => {
      const updatedQuery = await buildQueryFromText(text);

      dispatch({
        type: 'onSearchQueryChange',
        data: {
          query: updatedQuery,
          text,
        },
      });
    };

    // Update our State "sort" based on the URL "sort" and "sortdir"
    const updateSortFromURL = (sort?: URLState['sort']) => {
      if (!sort) {
        return;
      }

      dispatch({
        type: 'onTableChange',
        data: {
          sort: {
            field: sort.field,
            direction: sort.direction,
          },
        },
      });
    };

    const updateFilterFromURL = (filter?: URLState['filter']) => {
      if (!filter) {
        return;
      }

      dispatch({
        type: 'onTableChange',
        data: {
          filter: {
            createdBy: filter.createdBy ?? [],
            favorites: filter.favorites ?? false,
          },
        },
      });
    };

    updateQueryFromURL(urlState.s);
    updateSortFromURL(urlState.sort);
    updateFilterFromURL(urlState.filter);
  }, [urlState, buildQueryFromText, urlStateEnabled]);

  useEffect(() => {
    isMounted.current = true;

    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (initialQuery && !initialQueryInitialized.current) {
      initialQueryInitialized.current = true;
      buildQueryFromText(initialQuery).then(updateQuery);
    }
  }, [initialQuery, buildQueryFromText, updateQuery]);

  const PageTemplate = useMemo<typeof KibanaPageTemplate>(() => {
    return withoutPageTemplateWrapper
      ? ((({
          children: _children,
          'data-test-subj': dataTestSubj,
        }: {
          children: React.ReactNode;
          ['data-test-subj']?: string;
        }) => (
          <div data-test-subj={dataTestSubj}>{_children}</div>
        )) as unknown as typeof KibanaPageTemplate)
      : KibanaPageTemplate;
  }, [withoutPageTemplateWrapper]);

  // ------------
  // Render
  // ------------
  if (!hasInitialFetchReturned) {
    return null;
  }

  if (!showFetchError && hasNoItems) {
    return (
      <PageTemplate isEmptyState={true}>
        <KibanaPageTemplate.Section
          aria-labelledby={hasInitialFetchReturned ? headingId : undefined}
        >
          {renderNoItemsMessage()}
        </KibanaPageTemplate.Section>
      </PageTemplate>
    );
  }

  const testSubjectState = isDeletingItems
    ? 'table-is-deleting'
    : hasInitialFetchReturned && !isFetchingItems
    ? 'table-is-ready'
    : 'table-is-loading';

  return (
    <>
      {/* Too many items error */}
      {showLimitError && (
        <ListingLimitWarning
          canEditAdvancedSettings={canEditAdvancedSettings}
          advancedSettingsLink={getListingLimitSettingsUrl()}
          entityNamePlural={entityNamePlural}
          totalItems={totalItems}
          listingLimit={listingLimit}
        />
      )}

      {/* Error while fetching items */}
      {showFetchError && renderFetchError()}

      {/* Table of items */}
      <div data-test-subj={testSubjectState}>
        <Table<T>
          dispatch={dispatch}
          items={items}
          renderCreateButton={renderCreateButton}
          isFetchingItems={isFetchingItems}
          searchQuery={searchQuery}
          tableColumns={tableColumns}
          hasUpdatedAtMetadata={hasUpdatedAtMetadata}
          hasRecentlyAccessedMetadata={hasRecentlyAccessedMetadata}
          tableSort={tableSort}
          tableFilter={tableFilter}
          tableItemsRowActions={tableItemsRowActions}
          pagination={pagination}
          selectedIds={selectedIds}
          entityName={entityName}
          entityNamePlural={entityNamePlural}
          tagsToTableItemMap={tagsToTableItemMap}
          deleteItems={deleteItems}
          tableCaption={tableCaption}
          onTableChange={onTableChange}
          onTableSearchChange={onTableSearchChange}
          onSortChange={onSortChange}
          onFilterChange={onFilterChange}
          addOrRemoveIncludeTagFilter={addOrRemoveIncludeTagFilter}
          addOrRemoveExcludeTagFilter={addOrRemoveExcludeTagFilter}
          clearTagSelection={clearTagSelection}
          createdByEnabled={createdByEnabled}
          favoritesEnabled={isFavoritesEnabled()}
        />

        {/* Delete modal */}
        {showDeleteModal && (
          <ConfirmDeleteModal<T>
            isDeletingItems={isDeletingItems}
            entityName={entityName}
            entityNamePlural={entityNamePlural}
            items={selectedItems}
            onConfirm={deleteSelectedItems}
            onCancel={() => dispatch({ type: 'onCancelDeleteItems' })}
          />
        )}
      </div>
    </>
  );
}

export const TableListViewTable = React.memo(
  TableListViewTableComp
) as typeof TableListViewTableComp;
