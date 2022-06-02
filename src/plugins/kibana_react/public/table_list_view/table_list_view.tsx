/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

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
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage, FormattedRelative } from '@kbn/i18n-react';
import { ThemeServiceStart, HttpFetchError, ToastsStart, ApplicationStart } from '@kbn/core/public';
import { debounce, keyBy, sortBy, uniq, get } from 'lodash';
import React from 'react';
import moment from 'moment';
import { KibanaPageTemplate } from '../page_template';
import { toMountPoint } from '../util';

export interface TableListViewProps<V> {
  createItem?(): void;
  deleteItems?(items: V[]): Promise<void>;
  editItem?(item: V): void;
  entityName: string;
  entityNamePlural: string;
  findItems(query: string): Promise<{ total: number; hits: V[] }>;
  listingLimit: number;
  initialFilter: string;
  initialPageSize: number;
  /**
   * Should be an EuiEmptyPrompt (but TS doesn't support this typing)
   */
  emptyPrompt?: JSX.Element;
  tableColumns: Array<EuiBasicTableColumn<V>>;
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
}

export interface TableListViewState<V> {
  items: V[];
  hasInitialFetchReturned: boolean;
  hasUpdatedAtMetadata: boolean | null;
  isFetchingItems: boolean;
  isDeletingItems: boolean;
  showDeleteModal: boolean;
  showLimitError: boolean;
  fetchError?: HttpFetchError;
  filter: string;
  selectedIds: string[];
  totalItems: number;
  pagination: Pagination;
  tableSort?: {
    field: keyof V;
    direction: Direction;
  };
}

// saved object client does not support sorting by title because title is only mapped as analyzed
// the legacy implementation got around this by pulling `listingLimit` items and doing client side sorting
// and not supporting server-side paging.
// This component does not try to tackle these problems (yet) and is just feature matching the legacy component
// TODO support server side sorting/paging once title and description are sortable on the server.
class TableListView<V extends {}> extends React.Component<
  TableListViewProps<V>,
  TableListViewState<V>
> {
  private _isMounted = false;

  constructor(props: TableListViewProps<V>) {
    super(props);

    this.state = {
      items: [],
      totalItems: 0,
      hasInitialFetchReturned: false,
      hasUpdatedAtMetadata: null,
      isFetchingItems: false,
      isDeletingItems: false,
      showDeleteModal: false,
      showLimitError: false,
      filter: props.initialFilter,
      selectedIds: [],
      pagination: {
        pageIndex: 0,
        totalItemCount: 0,
        pageSize: props.initialPageSize,
        pageSizeOptions: uniq([10, 20, 50, props.initialPageSize]).sort(),
      },
    };
  }

  UNSAFE_componentWillMount() {
    this._isMounted = true;
  }

  componentWillUnmount() {
    this._isMounted = false;
    this.debouncedFetch.cancel();
  }

  componentDidMount() {
    this.fetchItems();
  }

  componentDidUpdate(prevProps: TableListViewProps<V>, prevState: TableListViewState<V>) {
    if (this.state.hasUpdatedAtMetadata === null && prevState.items !== this.state.items) {
      // We check if the saved object have the "updatedAt" metadata
      // to render or not that column in the table
      const hasUpdatedAtMetadata = Boolean(
        this.state.items.find((item: { updatedAt?: string }) => Boolean(item.updatedAt))
      );

      this.setState((prev) => {
        return {
          hasUpdatedAtMetadata,
          tableSort: hasUpdatedAtMetadata
            ? {
                field: 'updatedAt' as keyof V,
                direction: 'desc' as const,
              }
            : prev.tableSort,
          pagination: {
            ...prev.pagination,
            totalItemCount: this.state.items.length,
          },
        };
      });
    }
  }

  debouncedFetch = debounce(async (filter: string) => {
    try {
      const response = await this.props.findItems(filter);

      if (!this._isMounted) {
        return;
      }

      // We need this check to handle the case where search results come back in a different
      // order than they were sent out. Only load results for the most recent search.
      // Also, in case filter is empty, items are being pre-sorted alphabetically.
      if (filter === this.state.filter) {
        this.setState({
          hasInitialFetchReturned: true,
          isFetchingItems: false,
          items: !filter ? sortBy<V>(response.hits, 'title') : response.hits,
          totalItems: response.total,
          showLimitError: response.total > this.props.listingLimit,
        });
      }
    } catch (fetchError) {
      this.setState({
        hasInitialFetchReturned: true,
        isFetchingItems: false,
        items: [],
        totalItems: 0,
        showLimitError: false,
        fetchError,
      });
    }
  }, 300);

  fetchItems = () => {
    this.setState(
      {
        isFetchingItems: true,
        fetchError: undefined,
      },
      this.debouncedFetch.bind(null, this.state.filter)
    );
  };

  deleteSelectedItems = async () => {
    if (this.state.isDeletingItems || !this.props.deleteItems) {
      return;
    }
    this.setState({
      isDeletingItems: true,
    });
    try {
      const itemsById = keyBy(this.state.items, 'id');
      await this.props.deleteItems(this.state.selectedIds.map((id) => itemsById[id]));
    } catch (error) {
      this.props.toastNotifications.addDanger({
        title: toMountPoint(
          <FormattedMessage
            id="kibana-react.tableListView.listing.unableToDeleteDangerMessage"
            defaultMessage="Unable to delete {entityName}(s)"
            values={{ entityName: this.props.entityName }}
          />,
          { theme$: this.props.theme.theme$ }
        ),
        text: `${error}`,
      });
    }
    this.fetchItems();
    this.setState({
      isDeletingItems: false,
      selectedIds: [],
    });
    this.closeDeleteModal();
  };

  closeDeleteModal = () => {
    this.setState({ showDeleteModal: false });
  };

  openDeleteModal = () => {
    this.setState({ showDeleteModal: true });
  };

  setFilter({ queryText }: { queryText: string }) {
    // If the user is searching, we want to clear the sort order so that
    // results are ordered by Elasticsearch's relevance.
    this.setState(
      {
        filter: queryText,
      },
      this.fetchItems
    );
  }

  hasNoItems() {
    if (!this.state.isFetchingItems && this.state.items.length === 0 && !this.state.filter) {
      return true;
    }

    return false;
  }

  renderConfirmDeleteModal() {
    let deleteButton = (
      <FormattedMessage
        id="kibana-react.tableListView.listing.deleteSelectedItemsConfirmModal.confirmButtonLabel"
        defaultMessage="Delete"
      />
    );
    if (this.state.isDeletingItems) {
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
              itemCount: this.state.selectedIds.length,
              entityName:
                this.state.selectedIds.length === 1
                  ? this.props.entityName
                  : this.props.entityNamePlural,
            }}
          />
        }
        buttonColor="danger"
        onCancel={this.closeDeleteModal}
        onConfirm={this.deleteSelectedItems}
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
            values={{ entityNamePlural: this.props.entityNamePlural }}
          />
        </p>
      </EuiConfirmModal>
    );
  }

  renderListingLimitWarning() {
    if (this.state.showLimitError) {
      const canEditAdvancedSettings = this.props.application.capabilities.advancedSettings.save;
      const setting = 'savedObjects:listingLimit';
      const advancedSettingsLink = this.props.application.getUrlForApp('management', {
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
                    entityNamePlural: this.props.entityNamePlural,
                    totalItems: this.state.totalItems,
                    listingLimitValue: this.props.listingLimit,
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
                    entityNamePlural: this.props.entityNamePlural,
                    totalItems: this.state.totalItems,
                    listingLimitValue: this.props.listingLimit,
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
  }

  renderFetchError() {
    if (this.state.fetchError) {
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
                  entityName: this.props.entityName,
                  message: this.state.fetchError.body?.message || this.state.fetchError.message,
                }}
              />
            </p>
          </EuiCallOut>
          <EuiSpacer size="m" />
        </React.Fragment>
      );
    }
  }

  renderNoItemsMessage() {
    if (this.props.emptyPrompt) {
      return this.props.emptyPrompt;
    } else {
      return (
        <EuiEmptyPrompt
          title={
            <h1>
              {
                <FormattedMessage
                  id="kibana-react.tableListView.listing.noAvailableItemsMessage"
                  defaultMessage="No {entityNamePlural} available."
                  values={{ entityNamePlural: this.props.entityNamePlural }}
                />
              }
            </h1>
          }
          actions={this.renderCreateButton()}
        />
      );
    }
  }

  renderToolsLeft() {
    const selection = this.state.selectedIds;

    if (selection.length === 0) {
      return;
    }

    const onClick = () => {
      this.openDeleteModal();
    };

    return (
      <EuiButton
        color="danger"
        iconType="trash"
        onClick={onClick}
        data-test-subj="deleteSelectedItems"
      >
        <FormattedMessage
          id="kibana-react.tableListView.listing.deleteButtonMessage"
          defaultMessage="Delete {itemCount} {entityName}"
          values={{
            itemCount: selection.length,
            entityName:
              selection.length === 1 ? this.props.entityName : this.props.entityNamePlural,
          }}
        />
      </EuiButton>
    );
  }

  onTableChange(criteria: CriteriaWithPagination<V>) {
    this.setState((prev) => {
      const tableSort = criteria.sort ?? prev.tableSort;
      return {
        pagination: {
          ...prev.pagination,
          pageIndex: criteria.page.index,
          pageSize: criteria.page.size,
        },
        tableSort,
      };
    });

    if (criteria.sort) {
      this.setState({ tableSort: criteria.sort });
    }
  }

  renderTable() {
    const { searchFilters } = this.props;

    const selection = this.props.deleteItems
      ? {
          onSelectionChange: (obj: V[]) => {
            this.setState({
              selectedIds: obj
                .map((item) => (item as Record<string, undefined | string>)?.id)
                .filter((id): id is string => Boolean(id)),
            });
          },
        }
      : undefined;

    const search = {
      onChange: this.setFilter.bind(this),
      toolsLeft: this.renderToolsLeft(),
      defaultQuery: this.state.filter,
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
        values={{ entityNamePlural: this.props.entityNamePlural }}
      />
    );

    return (
      <EuiInMemoryTable
        itemId="id"
        items={this.state.items}
        columns={this.getTableColumns()}
        pagination={this.state.pagination}
        loading={this.state.isFetchingItems}
        message={noItemsMessage}
        selection={selection}
        search={search}
        sorting={this.state.tableSort ? { sort: this.state.tableSort as PropertySort } : undefined}
        onChange={this.onTableChange.bind(this)}
        data-test-subj="itemsInMemTable"
        rowHeader={this.props.rowHeader}
        tableCaption={this.props.tableCaption}
      />
    );
  }

  getTableColumns() {
    const columns = this.props.tableColumns.slice();

    // Add "Last update" column
    if (this.state.hasUpdatedAtMetadata) {
      const renderUpdatedAt = (dateTime?: string) => {
        if (!dateTime) {
          return (
            <EuiToolTip
              content={i18n.translate('kibana-react.tableListView.updatedDateUnknownLabel', {
                defaultMessage: 'Last updated unknown',
              })}
            >
              <span>-</span>
            </EuiToolTip>
          );
        }
        const updatedAt = moment(dateTime);

        if (updatedAt.diff(moment(), 'days') > -7) {
          return (
            <FormattedRelative value={new Date(dateTime).getTime()}>
              {(formattedDate: string) => (
                <EuiToolTip content={updatedAt.format('LL LT')}>
                  <span>{formattedDate}</span>
                </EuiToolTip>
              )}
            </FormattedRelative>
          );
        }
        return (
          <EuiToolTip content={updatedAt.format('LL LT')}>
            <span>{updatedAt.format('LL')}</span>
          </EuiToolTip>
        );
      };

      columns.push({
        field: 'updatedAt',
        name: i18n.translate('kibana-react.tableListView.lastUpdatedColumnTitle', {
          defaultMessage: 'Last updated',
        }),
        render: (field: string, record: { updatedAt?: string }) =>
          renderUpdatedAt(record.updatedAt),
        sortable: true,
        width: '150px',
      });
    }

    // Add "Actions" column
    if (this.props.editItem) {
      const actions: EuiTableActionsColumnType<V>['actions'] = [
        {
          name: (item) =>
            i18n.translate('kibana-react.tableListView.listing.table.editActionName', {
              defaultMessage: 'Edit {itemDescription}',
              values: {
                itemDescription: get(item, this.props.rowHeader),
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
          onClick: this.props.editItem,
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
  }

  renderCreateButton() {
    if (this.props.createItem) {
      return (
        <EuiButton
          onClick={this.props.createItem}
          data-test-subj="newItemButton"
          iconType="plusInCircleFilled"
          fill
        >
          <FormattedMessage
            id="kibana-react.tableListView.listing.createNewItemButtonLabel"
            defaultMessage="Create {entityName}"
            values={{ entityName: this.props.entityName }}
          />
        </EuiButton>
      );
    }
  }

  render() {
    const pageDTS = `${this.props.entityName}LandingPage`;

    if (!this.state.hasInitialFetchReturned) {
      return <></>;
    }

    if (!this.state.fetchError && this.hasNoItems()) {
      return (
        <KibanaPageTemplate
          data-test-subj={pageDTS}
          pageBodyProps={{
            'aria-labelledby': this.state.hasInitialFetchReturned
              ? this.props.headingId
              : undefined,
          }}
          isEmptyState={true}
        >
          {this.renderNoItemsMessage()}
        </KibanaPageTemplate>
      );
    }

    return (
      <KibanaPageTemplate
        data-test-subj={pageDTS}
        pageHeader={{
          pageTitle: <span id={this.props.headingId}>{this.props.tableListTitle}</span>,
          rightSideItems: [this.renderCreateButton()],
          'data-test-subj': 'top-nav',
        }}
        pageBodyProps={{
          'aria-labelledby': this.state.hasInitialFetchReturned ? this.props.headingId : undefined,
        }}
      >
        {this.state.showDeleteModal && this.renderConfirmDeleteModal()}
        {this.props.children}
        {this.renderListingLimitWarning()}
        {this.renderFetchError()}
        {this.renderTable()}
      </KibanaPageTemplate>
    );
  }
}

export { TableListView };

// eslint-disable-next-line import/no-default-export
export default TableListView;
