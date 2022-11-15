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
import { useOpenInspector } from '@kbn/content-management-inspector';
import type { OpenInspectorParams } from '@kbn/content-management-inspector';

import {
  Table,
  ConfirmDeleteModal,
  ListingLimitWarning,
  ItemDetails,
  UpdatedAtField,
} from './components';
import { useServices } from './services';
import type { SavedObjectsReference, SavedObjectsFindOptionsReference } from './services';
import type { Action } from './actions';
import { getReducer } from './reducer';
import type { SortColumnField } from './components';
import { useTags } from './use_tags';

interface InspectorConfig extends Pick<OpenInspectorParams, 'isReadonly' | 'onSave'> {
  enabled?: boolean;
}

export interface Props<T extends UserContentCommonSchema = UserContentCommonSchema> {
  entityName: string;
  entityNamePlural: string;
  tableListTitle: string;
  listingLimit: number;
  initialFilter?: string;
  initialPageSize: number;
  emptyPrompt?: JSX.Element;
  /** Add an additional custom column */
  customTableColumn?: EuiBasicTableColumn<T>;
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
  inspector?: InspectorConfig;
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

const ast = Ast.create([]);

function TableListViewComp<T extends UserContentCommonSchema>({
  tableListTitle,
  entityName,
  entityNamePlural,
  initialFilter: initialQuery,
  headingId,
  initialPageSize,
  listingLimit,
  customTableColumn,
  emptyPrompt,
  findItems,
  createItem,
  editItem,
  deleteItems,
  getDetailViewLink,
  onClickTitle,
  id = 'userContent',
  inspector = { enabled: false },
  children,
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

  if (inspector.isReadonly === false && inspector.onSave === undefined) {
    throw new Error(
      `[TableListView] A value for [inspector.onSave()] must be provided when [inspector.isReadonly] is false.`
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
  } = useServices();

  const openInspector = useOpenInspector();

  const reducer = useMemo(() => {
    return getReducer<T>();
  }, []);

  const [state, dispatch] = useReducer<(state: State<T>, action: Action<T>) => State<T>>(reducer, {
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
        ? { text: initialQuery, query: new Query(ast, undefined, initialQuery) }
        : { text: '', query: new Query(ast, undefined, '') },
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
  });

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

  const updateQuery = useCallback((query: Query) => {
    dispatch({
      type: 'onSearchQueryChange',
      data: { query, text: query.text },
    });
  }, []);

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

      openInspector({
        item: {
          id: item.id,
          title: item.attributes.title,
          description: item.attributes.description,
          tags,
        },
        entityName,
        ...inspector,
      });
    },
    [openInspector, inspector, getTagIdsFromReferences, entityName]
  );

  const tableColumns = useMemo(() => {
    const columns: Array<EuiBasicTableColumn<T>> = [
      {
        field: 'attributes.title',
        name: i18n.translate('contentManagement.tableList.mainColumnName', {
          defaultMessage: 'Name, description, tags',
        }),
        sortable: true,
        render: (field: keyof T, record: T) => {
          return (
            <ItemDetails<T>
              id={id}
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
    if (editItem || inspector.enabled !== false) {
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

      if (inspector.enabled !== false) {
        actions.push({
          name: (item) => {
            return i18n.translate('contentManagement.tableList.listing.table.inspectActionName', {
              defaultMessage: 'Inspect {itemDescription}',
              values: {
                itemDescription: get(item, 'attributes.title'),
              },
            });
          },
          description: i18n.translate(
            'contentManagement.tableList.listing.table.inspectActionDescription',
            {
              defaultMessage: 'Inspect',
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
    customTableColumn,
    hasUpdatedAtMetadata,
    editItem,
    id,
    getDetailViewLink,
    onClickTitle,
    searchQuery.text,
    addOrRemoveIncludeTagFilter,
    addOrRemoveExcludeTagFilter,
    DateFormatterComp,
    inspector,
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
  const fetchItems = useCallback(async () => {
    dispatch({ type: 'onFetchItems' });

    try {
      const idx = ++fetchIdx.current;

      const {
        searchQuery: searchQueryParsed,
        references,
        referencesToExclude,
      } = searchQueryParser
        ? searchQueryParser(searchQuery.text)
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
  }, [searchQueryParser, searchQuery, findItems]);

  const onSortChange = useCallback((field: SortColumnField, direction: Direction) => {
    dispatch({
      type: 'onTableSortChange',
      data: { field, direction },
    });
  }, []);

  const onTableChange = useCallback((criteria: CriteriaWithPagination<T>) => {
    dispatch({ type: 'onTableChange', data: criteria });
  }, []);

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

  if (!showFetchError && hasNoItems) {
    return (
      <KibanaPageTemplate panelled isEmptyState={true} data-test-subj={pageDataTestSubject}>
        <KibanaPageTemplate.Section
          aria-labelledby={hasInitialFetchReturned ? headingId : undefined}
        >
          {renderNoItemsMessage()}
        </KibanaPageTemplate.Section>
      </KibanaPageTemplate>
    );
  }

  return (
    <KibanaPageTemplate panelled data-test-subj={pageDataTestSubject}>
      <KibanaPageTemplate.Header
        pageTitle={<span id={headingId}>{tableListTitle}</span>}
        rightSideItems={[renderCreateButton() ?? <span />]}
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
      </KibanaPageTemplate.Section>
    </KibanaPageTemplate>
  );
}

const TableListView = React.memo(TableListViewComp) as typeof TableListViewComp;

export { TableListView };

// eslint-disable-next-line import/no-default-export
export default TableListView;
