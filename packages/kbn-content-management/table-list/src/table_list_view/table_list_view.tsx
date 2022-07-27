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
  EuiLink,
} from '@elastic/eui';
import { keyBy, uniq, get } from 'lodash';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { IHttpFetchError } from '@kbn/core-http-browser';
import { KibanaPageTemplate } from '@kbn/shared-ux-components';

import { SavedObjectsFindOptionsReference } from '../types';

import { Table, ConfirmDeleteModal, ListingLimitWarning } from './components';
import { useServices } from './services';
import type { Action } from './actions';
import { reducer } from './reducer';

export interface Props<T> {
  createItem?(): void;
  deleteItems?(items: T[]): Promise<void>;
  editItem?(item: T): void;
  entityName: string;
  entityNamePlural: string;
  findItems(
    searchQuery: string,
    references?: SavedObjectsFindOptionsReference[]
  ): Promise<{ total: number; hits: T[] }>;
  getDetailViewLink(entity: T): string;
  listingLimit: number;
  initialFilter: string;
  initialPageSize: number;
  /**
   * Should be an EuiEmptyPrompt (but TS doesn't support this typing)
   */
  emptyPrompt?: JSX.Element;
  /** Add an additional custom column */
  customTableColumn?: EuiBasicTableColumn<T>;
  tableListTitle: string;
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
  children?: ReactNode | undefined;
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
  references: SavedObjectsFindOptionsReference[];
  attributes: {
    title: string;
    description?: string;
  };
}

function TableListView<T extends UserContentCommonSchema>({
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
  getDetailViewLink,
  tableCaption,
  customTableColumn,
  initialPageSize,
  listingLimit,
  emptyPrompt,
  children,
}: Props<T>) {
  const isMounted = useRef(false);
  const fetchIdx = useRef(0);

  const { application, toast, savedObjectTagging, theme, toMountPoint } = useServices();

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
        field: 'title',
        name: i18n.translate('contentManagementTableList.titleColumnName', {
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
        field: 'description',
        name: i18n.translate('contentManagementTableList.descriptionColumnName', {
          defaultMessage: 'Description',
        }),
        render: (field: keyof T, record: T) => <span>{record.attributes.description}</span>,
        sortable: true,
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

    if (savedObjectTagging) {
      columns.push(savedObjectTagging.ui.getTableColumnDefinition());
    }

    // Add "Actions" column
    if (editItem) {
      const actions: EuiTableActionsColumnType<T>['actions'] = [
        {
          name: (item) =>
            i18n.translate('contentManagementTableList.listing.table.editActionName', {
              defaultMessage: 'Edit {itemDescription}',
              values: {
                itemDescription: get(item, rowHeader),
              },
            }),
          description: i18n.translate(
            'contentManagementTableList.listing.table.editActionDescription',
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
        name: i18n.translate('contentManagementTableList.listing.table.actionTitle', {
          defaultMessage: 'Actions',
        }),
        width: '100px',
        actions,
      });
    }

    return columns;
  }, [customTableColumn, stateTableColumns, editItem, rowHeader, savedObjectTagging]);
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

      let searchQuerySerialized = searchQuery;
      let references: SavedObjectsFindOptionsReference[] | undefined;
      if (savedObjectTagging) {
        const parsed = savedObjectTagging.ui.parseSearchQuery(searchQuery, {
          useName: true,
        });
        searchQuerySerialized = parsed.searchTerm;
        references = parsed.tagReferences;
      }

      const response = await findItems(searchQuerySerialized, references);

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
  }, [searchQuery, savedObjectTagging, findItems]);

  const deleteSelectedItems = useCallback(async () => {
    if (isDeletingItems) {
      return;
    }

    dispatch({ type: 'onDeleteItems' });

    try {
      await deleteItems!(selectedItems);
    } catch (error) {
      toast.addDanger({
        title: toMountPoint(
          <FormattedMessage
            id="contentManagementTableList.listing.unableToDeleteDangerMessage"
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
    toMountPoint,
    toast,
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
            id="contentManagementTableList.listing.createNewItemButtonLabel"
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
                  id="contentManagementTableList.listing.noAvailableItemsMessage"
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
              id="contentManagementTableList.listing.fetchErrorTitle"
              defaultMessage="Fetching listing failed"
            />
          }
          color="danger"
          iconType="alert"
        >
          <p>
            <FormattedMessage
              id="contentManagementTableList.listing.fetchErrorDescription"
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
          canEditAdvancedSettings={Boolean(application.capabilities.advancedSettings?.save)}
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
