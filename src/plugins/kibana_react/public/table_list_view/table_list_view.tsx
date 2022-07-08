/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/* eslint react-hooks/exhaustive-deps: 2 */

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
  SearchFilterConfig,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { ThemeServiceStart, HttpFetchError, ToastsStart, ApplicationStart } from '@kbn/core/public';
import { keyBy, uniq, get } from 'lodash';
import { KibanaPageTemplate } from '../page_template';
import { toMountPoint } from '../util';
import { Table, ConfirmDeleteModal, ListingLimitWarning } from './components';
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
  fetchError?: HttpFetchError;
  searchQuery: string;
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
  initialFilter: initialQuery,
  tableListTitle,
  entityName,
  entityNamePlural,
  headingId,
  rowHeader,
  tableCaption,
  tableColumns: tableColumnsProps,
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
    selectedIds: [],
    tableColumns: null,
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
    let columns = tableColumnsProps.slice();

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
  }, [tableColumnsProps, stateTableColumns, editItem, rowHeader]);
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
      const response = await findItems(searchQuery);

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
  }, [searchQuery, findItems]);

  const deleteSelectedItems = useCallback(async () => {
    if (isDeletingItems) {
      return;
    }

    dispatch({ type: 'onDeleteItems' });

    try {
      await deleteItems!(selectedItems);
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
    selectedItems,
    theme.theme$,
    toastNotifications,
  ]);

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

  const renderFetchError = useCallback(() => {
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
        rightSideItems: [renderCreateButton()],
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
          canEditAdvancedSettings={Boolean(application.capabilities.advancedSettings.save)}
          advancedSettingsLink={application.getUrlForApp('management', {
            path: `/kibana/settings?query=savedObjects:listingLimit`,
          })}
          entityNamePlural={entityNamePlural}
          totalItems={totalItems}
          listingLimit={listingLimit}
        />
      )}

      {/* Error while fetching items */}
      {showFetchError && renderFetchError()}

      {/* Table of items */}
      <Table
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
        searchFilters={searchFilters}
        tableCaption={tableCaption}
        rowHeader={rowHeader}
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

export { TableListView };

// eslint-disable-next-line import/no-default-export
export default TableListView;
