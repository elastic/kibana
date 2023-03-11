/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useReducer, useCallback, useEffect, useRef, useMemo, ReactNode } from 'react';
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
import type { OpenContentEditorParams } from '@kbn/content-management-content-editor';

import {
  Table,
  ConfirmDeleteModal,
  ListingLimitWarning,
  ItemDetails,
  UpdatedAtField,
} from './components';
import { useServices } from './services';
import type { SavedObjectsReference, SavedObjectsFindOptionsReference } from './services';
import { getReducer } from './reducer';
import type { SortColumnField } from './components';
import { useTags } from './use_tags';
import { useInRouterContext, useUrlState } from './use_url_state';

interface ContentEditorConfig
  extends Pick<OpenContentEditorParams, 'isReadonly' | 'onSave' | 'customValidators'> {
  enabled?: boolean;
}

export interface Props<T extends UserContentCommonSchema = UserContentCommonSchema> {
  entityName: string;
  entityNamePlural: string;
  tableListTitle: string;
  tableListDescription?: string;
  listingLimit: number;
  initialFilter?: string;
  initialPageSize: number;
  emptyPrompt?: JSX.Element;
  /** Add an additional custom column */
  customTableColumn?: EuiBasicTableColumn<T>;
  urlStateEnabled?: boolean;
  /**
   * Id of the heading element describing the table. This id will be used as `aria-labelledby` of the wrapper element.
   * If the table is not empty, this component renders its own h1 element using the same id.
   */
  headingId?: string;
  /** An optional id for the listing. Used to generate unique data-test-subj. Default: "userContent" */
  id?: string;
  children?: ReactNode | undefined;
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
  onClickTitle?: (item: T) => void;
  createItem?(): void;
  deleteItems?(items: T[]): Promise<void>;
  editItem?(item: T): void;
  /**
   * Name for the column containing the "title" value.
   */
  titleColumnName?: string;
  /**
   * Additional actions (buttons) to be placed in the page header.
   * @note only the first two values will be used.
   */
  additionalRightSideActions?: ReactNode[];
  /**
   * This assumes the content is already wrapped in an outer PageTemplate component.
   * @note Hack! This is being used as a workaround so that this page can be rendered in the Kibana management UI
   * @deprecated
   */
  withoutPageTemplateWrapper?: boolean;
  contentEditor?: ContentEditorConfig;
}

export interface State<T extends UserContentCommonSchema = UserContentCommonSchema> {
  items: T[];
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
  pagination: Pagination;
  tableSort: {
    field: SortColumnField;
    direction: Direction;
  };
}

export interface UserContentCommonSchema {
  id: string;
  updatedAt: string;
  references: SavedObjectsReference[];
  type: string;
  attributes: {
    title: string;
    description?: string;
  };
}

export interface URLState {
  s?: string;
  sort?: {
    field: SortColumnField;
    direction: Direction;
  };

  [key: string]: unknown;
}

interface URLQueryParams {
  s?: string;
  title?: string;
  sort?: string;
  sortdir?: string;

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

  if (sanitizedParams.sort === 'title' || sanitizedParams.sort === 'updatedAt') {
    const field = sanitizedParams.sort === 'title' ? 'attributes.title' : 'updatedAt';

    stateFromURL.sort = { field, direction: 'asc' };

    if (sanitizedParams.sortdir === 'desc' || sanitizedParams.sortdir === 'asc') {
      stateFromURL.sort.direction = sanitizedParams.sortdir;
    }
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

  return updatedQueryParams;
};

function TableListViewComp<T extends UserContentCommonSchema>({
  tableListTitle,
  tableListDescription,
  entityName,
  entityNamePlural,
  initialFilter: initialQuery,
  headingId,
  initialPageSize,
  listingLimit,
  urlStateEnabled = true,
  customTableColumn,
  emptyPrompt,
  findItems,
  createItem,
  editItem,
  deleteItems,
  getDetailViewLink,
  onClickTitle,
  id: listingId = 'userContent',
  contentEditor = { enabled: false },
  children,
  titleColumnName,
  additionalRightSideActions = [],
  withoutPageTemplateWrapper,
}: Props<T>) {
  if (!getDetailViewLink && !onClickTitle) {
    throw new Error(
      `[TableListView] One o["getDetailViewLink" or "onClickTitle"] prop must be provided.`
    );
  }

  if (getDetailViewLink && onClickTitle) {
    throw new Error(
      `[TableListView] Either "getDetailViewLink" or "onClickTitle" can be provided. Not both.`
    );
  }

  if (contentEditor.isReadonly === false && contentEditor.onSave === undefined) {
    throw new Error(
      `[TableListView] A value for [contentEditor.onSave()] must be provided when [contentEditor.isReadonly] is false.`
    );
  }

  const isMounted = useRef(false);
  const fetchIdx = useRef(0);

  const {
    canEditAdvancedSettings,
    getListingLimitSettingsUrl,
    getTagIdsFromReferences,
    searchQueryParser,
    notifyError,
    DateFormatterComp,
    getTagList,
  } = useServices();

  const openContentEditor = useOpenContentEditor();

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

  const initialState = useMemo<State<T>>(
    () => ({
      items: [],
      totalItems: 0,
      hasInitialFetchReturned: false,
      isFetchingItems: false,
      isDeletingItems: false,
      showDeleteModal: false,
      hasUpdatedAtMetadata: false,
      selectedIds: [],
      searchQuery:
        initialQuery !== undefined
          ? { text: initialQuery, query: new Query(Ast.create([]), undefined, initialQuery) }
          : { text: '', query: new Query(Ast.create([]), undefined, '') },
      pagination: {
        pageIndex: 0,
        totalItemCount: 0,
        pageSize: initialPageSize,
        pageSizeOptions: uniq([10, 20, 50, initialPageSize]).sort(),
      },
      tableSort: {
        field: 'attributes.title' as const,
        direction: 'asc',
      },
    }),
    [initialPageSize, initialQuery]
  );

  const [state, dispatch] = useReducer(reducer, initialState);

  const {
    searchQuery,
    hasInitialFetchReturned,
    isFetchingItems,
    items,
    fetchError,
    showDeleteModal,
    isDeletingItems,
    selectedIds,
    totalItems,
    hasUpdatedAtMetadata,
    pagination,
    tableSort,
  } = state;

  const hasQuery = searchQuery.text !== '';
  const hasNoItems = !isFetchingItems && items.length === 0 && !hasQuery;
  const pageDataTestSubject = `${entityName}LandingPage`;
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
        dispatch({
          type: 'onFetchItemsSuccess',
          data: {
            response,
          },
        });
      }
    } catch (err) {
      dispatch({
        type: 'onFetchItemsError',
        data: err,
      });
    }
  }, [searchQueryParser, findItems, searchQuery.text]);

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
        },
        entityName,
        ...contentEditor,
        onSave:
          contentEditor.onSave &&
          (async (args) => {
            await contentEditor.onSave!(args);
            await fetchItems();

            close();
          }),
      });
    },
    [getTagIdsFromReferences, openContentEditor, entityName, contentEditor, fetchItems]
  );

  const tableColumns = useMemo(() => {
    const columns: Array<EuiBasicTableColumn<T>> = [
      {
        field: 'attributes.title',
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
              onClickTitle={onClickTitle}
              onClickTag={(tag, withModifierKey) => {
                if (withModifierKey) {
                  addOrRemoveExcludeTagFilter(tag);
                } else {
                  addOrRemoveIncludeTagFilter(tag);
                }
              }}
              searchTerm={searchQuery.text}
            />
          );
        },
      },
    ];

    if (customTableColumn) {
      columns.push(customTableColumn);
    }

    if (hasUpdatedAtMetadata) {
      columns.push({
        field: 'updatedAt',
        name: i18n.translate('contentManagement.tableList.lastUpdatedColumnTitle', {
          defaultMessage: 'Last updated',
        }),
        render: (field: string, record: { updatedAt?: string }) => (
          <UpdatedAtField dateTime={record.updatedAt} DateFormatterComp={DateFormatterComp} />
        ),
        sortable: true,
        width: '150px',
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
          enabled: (v) => !(v as unknown as { error: string })?.error,
          onClick: editItem,
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
          icon: 'inspect',
          type: 'icon',
          onClick: inspectItem,
        });
      }

      columns.push({
        name: i18n.translate('contentManagement.tableList.listing.table.actionTitle', {
          defaultMessage: 'Actions',
        }),
        width: '100px',
        actions,
      });
    }

    return columns;
  }, [
    titleColumnName,
    customTableColumn,
    hasUpdatedAtMetadata,
    editItem,
    listingId,
    getDetailViewLink,
    onClickTitle,
    searchQuery.text,
    addOrRemoveIncludeTagFilter,
    addOrRemoveExcludeTagFilter,
    DateFormatterComp,
    contentEditor,
    inspectItem,
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
  const onTableSearchChange = useCallback(
    (arg: { query: Query | null; queryText: string }) => {
      const query = arg.query ?? new Query(Ast.create([]), undefined, arg.queryText);
      updateQuery(query);
    },
    [updateQuery]
  );

  const updateTableSortAndPagination = useCallback(
    (data: {
      sort?: State<T>['tableSort'];
      page?: {
        pageIndex: number;
        pageSize: number;
      };
    }) => {
      if (data.sort && urlStateEnabled) {
        setUrlState({
          sort: {
            field: data.sort.field === 'attributes.title' ? 'title' : data.sort.field,
            direction: data.sort.direction,
          },
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
      updateTableSortAndPagination({
        sort: {
          field,
          direction,
        },
      });
    },
    [updateTableSortAndPagination]
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
        data.sort = {
          field: criteria.sort.field as SortColumnField,
          direction: criteria.sort.direction,
        };
      }

      data.page = {
        pageIndex: criteria.page.index,
        pageSize: criteria.page.size,
      };

      updateTableSortAndPagination(data);
    },
    [updateTableSortAndPagination]
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
          iconType="alert"
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
  useDebounce(fetchItems, 300, [fetchItems]);

  useEffect(() => {
    if (!urlStateEnabled) {
      return;
    }

    // Update our Query instance based on the URL "s" text
    const updateQueryFromURL = async (text: string = '') => {
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

      const updatedQuery = new Query(ast, undefined, text);

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

    updateQueryFromURL(urlState.s);
    updateSortFromURL(urlState.sort);
  }, [urlState, searchQueryParser, getTagList, urlStateEnabled]);

  useEffect(() => {
    isMounted.current = true;

    return () => {
      isMounted.current = false;
    };
  }, []);

  // ------------
  // Render
  // ------------
  if (!hasInitialFetchReturned) {
    return null;
  }

  const PageTemplate = withoutPageTemplateWrapper
    ? (React.Fragment as unknown as typeof KibanaPageTemplate)
    : KibanaPageTemplate;

  if (!showFetchError && hasNoItems) {
    return (
      <PageTemplate panelled isEmptyState={true} data-test-subj={pageDataTestSubject}>
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
    <PageTemplate panelled data-test-subj={pageDataTestSubject}>
      <KibanaPageTemplate.Header
        pageTitle={<span id={headingId}>{tableListTitle}</span>}
        description={tableListDescription}
        rightSideItems={[
          renderCreateButton() ?? <span />,
          ...additionalRightSideActions?.slice(0, 2),
        ]}
        data-test-subj="top-nav"
      />
      <KibanaPageTemplate.Section aria-labelledby={hasInitialFetchReturned ? headingId : undefined}>
        {/* Any children passed to the component */}
        {children}

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
            isFetchingItems={isFetchingItems}
            searchQuery={searchQuery}
            tableColumns={tableColumns}
            hasUpdatedAtMetadata={hasUpdatedAtMetadata}
            tableSort={tableSort}
            pagination={pagination}
            selectedIds={selectedIds}
            entityName={entityName}
            entityNamePlural={entityNamePlural}
            tagsToTableItemMap={tagsToTableItemMap}
            deleteItems={deleteItems}
            tableCaption={tableListTitle}
            onTableChange={onTableChange}
            onTableSearchChange={onTableSearchChange}
            onSortChange={onSortChange}
            addOrRemoveIncludeTagFilter={addOrRemoveIncludeTagFilter}
            addOrRemoveExcludeTagFilter={addOrRemoveExcludeTagFilter}
            clearTagSelection={clearTagSelection}
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
      </KibanaPageTemplate.Section>
    </PageTemplate>
  );
}

const TableListView = React.memo(TableListViewComp) as typeof TableListViewComp;

export { TableListView };

// eslint-disable-next-line import/no-default-export
export default TableListView;
