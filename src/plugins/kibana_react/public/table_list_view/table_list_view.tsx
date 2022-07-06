/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/* eslint react-hooks/exhaustive-deps: 2 */

import React, { useReducer, useCallback, useEffect, useRef, ReactNode } from 'react';
import useDebounce from 'react-use/lib/useDebounce';
import {
  EuiBasicTableColumn,
  EuiButton,
  EuiCallOut,
  EuiConfirmModal,
  EuiEmptyPrompt,
  EuiInMemoryTable,
  Pagination,
  CriteriaWithPagination,
  PropertySort,
  Direction,
  EuiLink,
  EuiSpacer,
  EuiTableActionsColumnType,
  SearchFilterConfig,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { ThemeServiceStart, HttpFetchError, ToastsStart, ApplicationStart } from '@kbn/core/public';
import { keyBy, uniq, get } from 'lodash';
import { KibanaPageTemplate } from '../page_template';
import { toMountPoint } from '../util';
import type { Action } from './actions';
import { reducer } from './reducer';

export interface Props<T> {
  createItem?(): void;
  deleteItems?(items: T[]): Promise<void>;
  editItem?(item: T): void;
  entityName: string;
  entityNamePlural: string;
  findItems(query: string): Promise<{ total: number; hits: T[] }>;
  listingLimit: number;
  initialFilter: string;
  initialPageSize: number;
  /**
   * Should be an EuiEmptyPrompt (but TS doesn't support this typing)
   */
  emptyPrompt?: JSX.Element;
  tableColumns: Array<EuiBasicTableColumn<T>>;
  tableListTitle: string;
  toastNotifications: ToastsStart;
  /**
   * Id of the heading element describing the table. This id will be used as `aria-labelledby` of the wrapper element.
   * If the table is not empty, this component renders its own h1 element using the same id.
   */
  headingId?: string;
  /**
   * Indicates which column should be used as the identifying cell in each row.
   */
  rowHeader: string;
  /**
   * Describes the content of the table. If not specified, the caption will be "This table contains {itemCount} rows."
   */
  tableCaption: string;
  searchFilters?: SearchFilterConfig[];
  theme: ThemeServiceStart;
  application: ApplicationStart;
  children?: ReactNode | undefined;
}

export interface State<T = unknown> {
  items: T[];
  hasInitialFetchReturned: boolean;
  isFetchingItems: boolean;
  isDeletingItems: boolean;
  showDeleteModal: boolean;
  showLimitError: boolean;
  fetchError?: HttpFetchError;
  filter: string;
  selectedIds: string[];
  totalItems: number;
  tableColumns: Array<EuiBasicTableColumn<T>> | null;
  pagination: Pagination;
  tableSort?: {
    field: keyof T;
    direction: Direction;
  };
}

function TableListView<T>({
  findItems,
  createItem,
  editItem,
  deleteItems,
  initialFilter,
  tableListTitle,
  entityName,
  entityNamePlural,
  headingId,
  rowHeader,
  tableCaption,
  tableColumns,
  searchFilters,
  initialPageSize,
  listingLimit,
  emptyPrompt,
  toastNotifications,
  application,
  theme,
  children,
}: Props<T>) {
  const isMounted = useRef(false);
  const fetchIdx = useRef(0);

  const [state, dispatch] = useReducer<(state: State<T>, action: Action<T>) => State<T>>(reducer, {
    items: [],
    totalItems: 0,
    hasInitialFetchReturned: false,
    isFetchingItems: false,
    isDeletingItems: false,
    showDeleteModal: false,
    showLimitError: false,
    selectedIds: [],
    tableColumns: null,
    filter: initialFilter,
    pagination: {
      pageIndex: 0,
      totalItemCount: 0,
      pageSize: initialPageSize,
      pageSizeOptions: uniq([10, 20, 50, initialPageSize]).sort(),
    },
  });

  const {
    filter,
    hasInitialFetchReturned,
    isFetchingItems,
    items,
    fetchError,
    showDeleteModal,
    isDeletingItems,
    selectedIds,
    showLimitError,
    totalItems,
    tableColumns: stateTableColumns,
    pagination,
    tableSort,
  } = state;
  const hasNoItems = !isFetchingItems && items.length === 0 && !filter;
  const pageDTS = `${entityName}LandingPage`;

  const fetchItems = useCallback(async () => {
    dispatch({ type: 'onFetchItems' });

    try {
      const idx = ++fetchIdx.current;
      const response = await findItems(filter);

      if (!isMounted.current) {
        return;
      }

      if (idx === fetchIdx.current) {
        dispatch({
          type: 'onFetchItemsSuccess',
          data: {
            response,
            listingLimit,
          },
        });
      }
    } catch (err) {
      dispatch({
        type: 'onFetchItemsError',
        data: err,
      });
    }
  }, [filter, findItems, listingLimit]);

  const deleteSelectedItems = useCallback(async () => {
    if (isDeletingItems || !deleteItems) {
      return;
    }

    dispatch({ type: 'onDeleteItems' });

    try {
      const itemsById = keyBy(items, 'id');
      await deleteItems(selectedIds.map((id) => itemsById[id]));
    } catch (error) {
      toastNotifications.addDanger({
        title: toMountPoint(
          <FormattedMessage
            id="kibana-react.tableListView.listing.unableToDeleteDangerMessage"
            defaultMessage="Unable to delete {entityName}(s)"
            values={{ entityName }}
          />,
          { theme$: theme.theme$ }
        ),
        text: `${error}`,
      });
    }

    fetchItems();

    dispatch({ type: 'onItemsDeleted' });
  }, [
    deleteItems,
    entityName,
    fetchItems,
    isDeletingItems,
    items,
    selectedIds,
    theme.theme$,
    toastNotifications,
  ]);

  const getTableColumns = useCallback(() => {
    let columns = tableColumns.slice();

    if (stateTableColumns) {
      columns = columns.concat(stateTableColumns);
    }

    // Add "Actions" column
    if (editItem) {
      const actions: EuiTableActionsColumnType<T>['actions'] = [
        {
          name: (item) =>
            i18n.translate('kibana-react.tableListView.listing.table.editActionName', {
              defaultMessage: 'Edit {itemDescription}',
              values: {
                itemDescription: get(item, rowHeader),
              },
            }),
          description: i18n.translate(
            'kibana-react.tableListView.listing.table.editActionDescription',
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
        name: i18n.translate('kibana-react.tableListView.listing.table.actionTitle', {
          defaultMessage: 'Actions',
        }),
        width: '100px',
        actions,
      });
    }

    return columns;
  }, [editItem, stateTableColumns, rowHeader, tableColumns]);

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
            id="kibana-react.tableListView.listing.createNewItemButtonLabel"
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
                  id="kibana-react.tableListView.listing.noAvailableItemsMessage"
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

  const renderConfirmDeleteModal = useCallback(() => {
    let deleteButton = (
      <FormattedMessage
        id="kibana-react.tableListView.listing.deleteSelectedItemsConfirmModal.confirmButtonLabel"
        defaultMessage="Delete"
      />
    );

    if (isDeletingItems) {
      deleteButton = (
        <FormattedMessage
          id="kibana-react.tableListView.listing.deleteSelectedItemsConfirmModal.confirmButtonLabelDeleting"
          defaultMessage="Deleting"
        />
      );
    }

    return (
      <EuiConfirmModal
        title={
          <FormattedMessage
            id="kibana-react.tableListView.listing.deleteSelectedConfirmModal.title"
            defaultMessage="Delete {itemCount} {entityName}?"
            values={{
              itemCount: selectedIds.length,
              entityName: selectedIds.length === 1 ? entityName : entityNamePlural,
            }}
          />
        }
        buttonColor="danger"
        onCancel={() => dispatch({ type: 'onCancelDeleteItems' })}
        onConfirm={deleteSelectedItems}
        cancelButtonText={
          <FormattedMessage
            id="kibana-react.tableListView.listing.deleteSelectedItemsConfirmModal.cancelButtonLabel"
            defaultMessage="Cancel"
          />
        }
        confirmButtonText={deleteButton}
        defaultFocusedButton="cancel"
      >
        <p>
          <FormattedMessage
            id="kibana-react.tableListView.listing.deleteConfirmModalDescription"
            defaultMessage="You can't recover deleted {entityNamePlural}."
            values={{ entityNamePlural }}
          />
        </p>
      </EuiConfirmModal>
    );
  }, [deleteSelectedItems, entityName, entityNamePlural, isDeletingItems, selectedIds.length]);

  const renderListingLimitWarning = useCallback(() => {
    if (showLimitError) {
      const canEditAdvancedSettings = application.capabilities.advancedSettings.save;
      const setting = 'savedObjects:listingLimit';
      const advancedSettingsLink = application.getUrlForApp('management', {
        path: `/kibana/settings?query=${setting}`,
      });
      return (
        <React.Fragment>
          <EuiCallOut
            title={
              <FormattedMessage
                id="kibana-react.tableListView.listing.listingLimitExceededTitle"
                defaultMessage="Listing limit exceeded"
              />
            }
            color="warning"
            iconType="help"
          >
            <p>
              {canEditAdvancedSettings ? (
                <FormattedMessage
                  id="kibana-react.tableListView.listing.listingLimitExceededDescription"
                  defaultMessage="You have {totalItems} {entityNamePlural}, but your {listingLimitText} setting prevents
                the table below from displaying more than {listingLimitValue}. You can change this setting under {advancedSettingsLink}."
                  values={{
                    entityNamePlural,
                    totalItems,
                    listingLimitValue: listingLimit,
                    listingLimitText: <strong>listingLimit</strong>,
                    advancedSettingsLink: (
                      <EuiLink href={advancedSettingsLink}>
                        <FormattedMessage
                          id="kibana-react.tableListView.listing.listingLimitExceeded.advancedSettingsLinkText"
                          defaultMessage="Advanced Settings"
                        />
                      </EuiLink>
                    ),
                  }}
                />
              ) : (
                <FormattedMessage
                  id="kibana-react.tableListView.listing.listingLimitExceededDescriptionNoPermissions"
                  defaultMessage="You have {totalItems} {entityNamePlural}, but your {listingLimitText} setting prevents
                  the table below from displaying more than {listingLimitValue}. Contact your system administrator to change this setting."
                  values={{
                    entityNamePlural,
                    totalItems,
                    listingLimitValue: listingLimit,
                    listingLimitText: <strong>listingLimit</strong>,
                  }}
                />
              )}
            </p>
          </EuiCallOut>
          <EuiSpacer size="m" />
        </React.Fragment>
      );
    }
  }, [application, entityNamePlural, listingLimit, showLimitError, totalItems]);

  const renderFetchError = useCallback(() => {
    if (fetchError) {
      return (
        <React.Fragment>
          <EuiCallOut
            title={
              <FormattedMessage
                id="kibana-react.tableListView.listing.fetchErrorTitle"
                defaultMessage="Fetching listing failed"
              />
            }
            color="danger"
            iconType="alert"
          >
            <p>
              <FormattedMessage
                id="kibana-react.tableListView.listing.fetchErrorDescription"
                defaultMessage="The {entityName} listing could not be fetched: {message}."
                values={{
                  entityName,
                  message: fetchError.body?.message || fetchError.message,
                }}
              />
            </p>
          </EuiCallOut>
          <EuiSpacer size="m" />
        </React.Fragment>
      );
    }
  }, [entityName, fetchError]);

  const renderToolsLeft = useCallback(() => {
    const selection = selectedIds;

    if (selectedIds.length === 0) {
      return;
    }

    return (
      <EuiButton
        color="danger"
        iconType="trash"
        onClick={() => dispatch({ type: 'onClickDeleteItems' })}
        data-test-subj="deleteSelectedItems"
      >
        <FormattedMessage
          id="kibana-react.tableListView.listing.deleteButtonMessage"
          defaultMessage="Delete {itemCount} {entityName}"
          values={{
            itemCount: selection.length,
            entityName: selection.length === 1 ? entityName : entityNamePlural,
          }}
        />
      </EuiButton>
    );
  }, [entityName, entityNamePlural, selectedIds]);

  const renderTable = useCallback(() => {
    const selection = deleteItems
      ? {
          onSelectionChange: (obj: T[]) => {
            dispatch({ type: 'onSelectionChange', data: obj });
          },
        }
      : undefined;

    const search = {
      onChange: ({ queryText }: { queryText: string }) =>
        dispatch({ type: 'onFilterChange', data: queryText }),
      toolsLeft: renderToolsLeft(),
      defaultQuery: filter,
      box: {
        incremental: true,
        'data-test-subj': 'tableListSearchBox',
      },
      filters: searchFilters ?? [],
    };

    const noItemsMessage = (
      <FormattedMessage
        id="kibana-react.tableListView.listing.noMatchedItemsMessage"
        defaultMessage="No {entityNamePlural} matched your search."
        values={{ entityNamePlural }}
      />
    );

    return (
      <EuiInMemoryTable
        itemId="id"
        items={items}
        columns={getTableColumns()}
        pagination={pagination}
        loading={isFetchingItems}
        message={noItemsMessage}
        selection={selection}
        search={search}
        sorting={tableSort ? { sort: tableSort as PropertySort } : undefined}
        onChange={(criteria: CriteriaWithPagination<T>) =>
          dispatch({ type: 'onTableChange', data: criteria })
        }
        data-test-subj="itemsInMemTable"
        rowHeader={rowHeader}
        tableCaption={tableCaption}
      />
    );
  }, [
    deleteItems,
    entityNamePlural,
    filter,
    getTableColumns,
    isFetchingItems,
    items,
    pagination,
    renderToolsLeft,
    rowHeader,
    searchFilters,
    tableCaption,
    tableSort,
  ]);

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

  if (!hasInitialFetchReturned) {
    return null;
  }

  if (!fetchError && hasNoItems) {
    return (
      <KibanaPageTemplate
        data-test-subj={pageDTS}
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
      data-test-subj={pageDTS}
      pageHeader={{
        pageTitle: <span id={headingId}>{tableListTitle}</span>,
        rightSideItems: [renderCreateButton()],
        'data-test-subj': 'top-nav',
      }}
      pageBodyProps={{
        'aria-labelledby': hasInitialFetchReturned ? headingId : undefined,
      }}
    >
      {showDeleteModal && renderConfirmDeleteModal()}
      {children}
      {renderListingLimitWarning()}
      {renderFetchError()}
      {renderTable()}
    </KibanaPageTemplate>
  );
}

export { TableListView };

// eslint-disable-next-line import/no-default-export
export default TableListView;
