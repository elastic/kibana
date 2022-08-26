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
  EuiLink,
} from '@elastic/eui';
import { keyBy, uniq, get } from 'lodash';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { IHttpFetchError } from '@kbn/core-http-browser';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';

import { Table, ConfirmDeleteModal, ListingLimitWarning } from './components';
import { useServices } from './services';
import type { SavedObjectsReference } from './services';
import type { Action } from './actions';
import { reducer } from './reducer';

export interface Props<T extends UserContentCommonSchema = UserContentCommonSchema> {
  entityName: string;
  entityNamePlural: string;
  tableListTitle: string;
  listingLimit: number;
  initialFilter: string;
  initialPageSize: number;
  emptyPrompt?: JSX.Element;
  /** Add an additional custom column */
  customTableColumn?: EuiBasicTableColumn<T>;
  /**
   * Id of the heading element describing the table. This id will be used as `aria-labelledby` of the wrapper element.
   * If the table is not empty, this component renders its own h1 element using the same id.
   */
  headingId?: string;
  children?: ReactNode | undefined;
  findItems(
    searchQuery: string,
    references?: SavedObjectsReference[]
  ): Promise<{ total: number; hits: T[] }>;
  getDetailViewLink(entity: T): string;
  createItem?(): void;
  deleteItems?(items: T[]): Promise<void>;
  editItem?(item: T): void;
}

export interface State<T extends UserContentCommonSchema = UserContentCommonSchema> {
  items: T[];
  hasInitialFetchReturned: boolean;
  isFetchingItems: boolean;
  isDeletingItems: boolean;
  showDeleteModal: boolean;
  fetchError?: IHttpFetchError<Error>;
  searchQuery: string;
  selectedIds: string[];
  totalItems: number;
  tableColumns: Array<EuiBasicTableColumn<T>>;
  pagination: Pagination;
  tableSort?: {
    field: keyof T;
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
  children,
}: Props<T>) {
  const isMounted = useRef(false);
  const fetchIdx = useRef(0);

  const {
    canEditAdvancedSettings,
    getListingLimitSettingsUrl,
    getTagsColumnDefinition,
    searchQueryParser,
    notifyError,
  } = useServices();

  const [state, dispatch] = useReducer<(state: State<T>, action: Action<T>) => State<T>>(reducer, {
    items: [],
    totalItems: 0,
    hasInitialFetchReturned: false,
    isFetchingItems: false,
    isDeletingItems: false,
    showDeleteModal: false,
    selectedIds: [],
    tableColumns: [
      {
        field: 'attributes.title',
        name: i18n.translate('contentManagement.tableList.titleColumnName', {
          defaultMessage: 'Title',
        }),
        sortable: true,
        render: (field: keyof T, record: T) => (
          <EuiLink
            href={getDetailViewLink(record)}
            data-test-subj={`userContentListingTitleLink-${record.attributes.title
              .split(' ')
              .join('-')}`}
          >
            {record.attributes.title}
          </EuiLink>
        ),
      },
      {
        field: 'attributes.description',
        name: i18n.translate('contentManagement.tableList.descriptionColumnName', {
          defaultMessage: 'Description',
        }),
      },
    ],
    searchQuery: initialQuery,
    pagination: {
      pageIndex: 0,
      totalItemCount: 0,
      pageSize: initialPageSize,
      pageSizeOptions: uniq([10, 20, 50, initialPageSize]).sort(),
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
    tableColumns: stateTableColumns,
    pagination,
    tableSort,
  } = state;
  const hasNoItems = !isFetchingItems && items.length === 0 && !searchQuery;
  const pageDataTestSubject = `${entityName}LandingPage`;
  const showFetchError = Boolean(fetchError);
  const showLimitError = !showFetchError && totalItems > listingLimit;

  const tableColumns = useMemo(() => {
    const columns = stateTableColumns.slice();

    if (customTableColumn) {
      columns.push(customTableColumn);
    }

    const tagsColumnDef = getTagsColumnDefinition ? getTagsColumnDefinition() : undefined;
    if (tagsColumnDef) {
      columns.push(tagsColumnDef);
    }

    // Add "Actions" column
    if (editItem) {
      const actions: EuiTableActionsColumnType<T>['actions'] = [
        {
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
        },
      ];

      columns.push({
        name: i18n.translate('contentManagement.tableList.listing.table.actionTitle', {
          defaultMessage: 'Actions',
        }),
        width: '100px',
        actions,
      });
    }

    return columns;
  }, [stateTableColumns, customTableColumn, getTagsColumnDefinition, editItem]);
  const itemsById = useMemo(() => {
    return keyBy(items, 'id');
  }, [items]);
  const selectedItems = useMemo(() => {
    return selectedIds.map((id) => itemsById[id]);
  }, [selectedIds, itemsById]);

  // ------------
  // Callbacks
  // ------------
  const fetchItems = useCallback(async () => {
    dispatch({ type: 'onFetchItems' });

    try {
      const idx = ++fetchIdx.current;

      const { searchQuery: searchQueryParsed, references } = searchQueryParser
        ? searchQueryParser(searchQuery)
        : { searchQuery, references: undefined };

      const response = await findItems(searchQueryParsed, references);

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

  const deleteSelectedItems = useCallback(async () => {
    if (isDeletingItems) {
      return;
    }

    dispatch({ type: 'onDeleteItems' });

    try {
      await deleteItems!(selectedItems);
    } catch (error) {
      notifyError({
        title: (
          <FormattedMessage
            id="contentManagement.tableList.listing.unableToDeleteDangerMessage"
            defaultMessage="Unable to delete {entityName}(s)"
            values={{ entityName }}
          />
        ),
        text: error,
      });
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

  if (!fetchError && hasNoItems) {
    return (
      <KibanaPageTemplate
        data-test-subj={pageDataTestSubject}
        pageBodyProps={{
          'aria-labelledby': hasInitialFetchReturned ? headingId : undefined,
        }}
        isEmptyState={true}
      >
        {renderNoItemsMessage()}
      </KibanaPageTemplate>
    );
  }

  return (
    <KibanaPageTemplate
      data-test-subj={pageDataTestSubject}
      pageHeader={{
        pageTitle: <span id={headingId}>{tableListTitle}</span>,
        rightSideItems: [renderCreateButton() ?? <span />],
        'data-test-subj': 'top-nav',
      }}
      pageBodyProps={{
        'aria-labelledby': hasInitialFetchReturned ? headingId : undefined,
      }}
    >
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
        tableSort={tableSort}
        pagination={pagination}
        selectedIds={selectedIds}
        entityName={entityName}
        entityNamePlural={entityNamePlural}
        deleteItems={deleteItems}
        tableCaption={tableListTitle}
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
    </KibanaPageTemplate>
  );
}

const TableListView = React.memo(TableListViewComp) as typeof TableListViewComp;

export { TableListView };

// eslint-disable-next-line import/no-default-export
export default TableListView;
