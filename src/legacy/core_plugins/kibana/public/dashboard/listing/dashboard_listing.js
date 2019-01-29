/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { injectI18n, FormattedMessage } from '@kbn/i18n/react';
import _ from 'lodash';
import { toastNotifications } from 'ui/notify';
import {
  EuiTitle,
  EuiFieldSearch,
  EuiBasicTable,
  EuiPage,
  EuiPageBody,
  EuiPageContent,
  EuiLink,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
  EuiSpacer,
  EuiOverlayMask,
  EuiConfirmModal,
  EuiCallOut,
  EuiText,
  EuiTextColor,
  EuiEmptyPrompt,
} from '@elastic/eui';
import { DashboardConstants, createDashboardEditUrl } from '../dashboard_constants';

export const EMPTY_FILTER = '';

// saved object client does not support sorting by title because title is only mapped as analyzed
// the legacy implementation got around this by pulling `listingLimit` items and doing client side sorting
// and not supporting server-side paging.
// This component does not try to tackle these problems (yet) and is just feature matching the legacy component
// TODO support server side sorting/paging once title and description are sortable on the server.
class DashboardListingUi extends React.Component {

  constructor(props) {
    super(props);

    this.state = {
      ...defaultSortOrder(this.props.initialFilter),
      hasInitialFetchReturned: false,
      isFetchingItems: false,
      showDeleteModal: false,
      showLimitError: false,
      filter: this.props.initialFilter,
      dashboards: [],
      selectedIds: [],
      page: 0,
      perPage: 20,
    };
  }

  componentWillMount() {
    this._isMounted = true;
  }

  componentWillUnmount() {
    this._isMounted = false;
    this.debouncedFetch.cancel();
  }

  componentDidMount() {
    this.fetchItems();
  }

  debouncedFetch = _.debounce(async (filter) => {
    const response = await this.props.find(filter);

    if (!this._isMounted) {
      return;
    }

    // We need this check to handle the case where search results come back in a different
    // order than they were sent out. Only load results for the most recent search.
    if (filter === this.state.filter) {
      this.setState({
        hasInitialFetchReturned: true,
        isFetchingItems: false,
        dashboards: response.hits,
        totalDashboards: response.total,
        showLimitError: response.total > this.props.listingLimit,
      });
    }
  }, 300);

  fetchItems = () => {
    this.setState({
      isFetchingItems: true,
    }, this.debouncedFetch.bind(null, this.state.filter));
  }

  deleteSelectedItems = async () => {
    try {
      await this.props.delete(this.state.selectedIds);
    } catch (error) {
      toastNotifications.addDanger({
        title: (
          <FormattedMessage
            id="kbn.dashboard.listing.unableToDeleteDashboardsDangerMessage"
            defaultMessage="Unable to delete dashboard(s)"
          />
        ),
        text: `${error}`,
      });
    }
    this.fetchItems();
    this.setState({
      selectedIds: []
    });
    this.closeDeleteModal();
  }

  closeDeleteModal = () => {
    this.setState({ showDeleteModal: false });
  };

  openDeleteModal = () => {
    this.setState({ showDeleteModal: true });
  };

  setFilter(filter) {
    // If the user is searching, we want to clear the sort order so that
    // results are ordered by Elasticsearch's relevance.
    this.setState({
      ...defaultSortOrder(filter),
      filter,
    }, this.fetchItems);
  }

  onTableChange = ({ page, sort = {} }) => {
    const {
      index: pageIndex,
      size: pageSize,
    } = page;

    let {
      field: sortField,
      direction: sortDirection,
    } = sort;

    // 3rd sorting state that is not captured by sort - default order (asc by title)
    // when switching from desc to asc for the same, non-default field - use default order,
    // unless we have a filter, in which case, we want to use Elasticsearch's ranking order.
    if (this.state.sortField === sortField
      && this.state.sortDirection === 'desc'
      && sortDirection === 'asc') {

      const defaultSort = defaultSortOrder(this.state.filter);

      sortField = defaultSort.sortField;
      sortDirection = defaultSort.sortDirection;
    }

    this.setState({
      page: pageIndex,
      perPage: pageSize,
      sortField,
      sortDirection,
    });
  }

  // server-side paging not supported - see component comment for details
  getPageOfItems = () => {
    // do not sort original list to preserve elasticsearch ranking order
    const dashboardsCopy = this.state.dashboards.slice();

    if (this.state.sortField) {
      dashboardsCopy.sort((a, b) => {
        const fieldA = _.get(a, this.state.sortField, '');
        const fieldB = _.get(b, this.state.sortField, '');
        let order = 1;
        if (this.state.sortDirection === 'desc') {
          order = -1;
        }
        return order * fieldA.toLowerCase().localeCompare(fieldB.toLowerCase());
      });
    }

    // If begin is greater than the length of the sequence, an empty array is returned.
    const startIndex = this.state.page * this.state.perPage;
    // If end is greater than the length of the sequence, slice extracts through to the end of the sequence (arr.length).
    const lastIndex = startIndex + this.state.perPage;
    return dashboardsCopy.slice(startIndex, lastIndex);
  }

  hasNoDashboards() {
    if (!this.state.isFetchingItems && this.state.dashboards.length === 0 && !this.state.filter) {
      return true;
    }

    return false;
  }

  renderConfirmDeleteModal() {
    return (
      <EuiOverlayMask>
        <EuiConfirmModal
          title={
            <FormattedMessage
              id="kbn.dashboard.listing.deleteSelectedDashboardsConfirmModal.title"
              defaultMessage="Delete selected dashboards?"
            />
          }
          onCancel={this.closeDeleteModal}
          onConfirm={this.deleteSelectedItems}
          cancelButtonText={
            <FormattedMessage
              id="kbn.dashboard.listing.deleteSelectedDashboardsConfirmModal.cancelButtonLabel"
              defaultMessage="Cancel"
            />
          }
          confirmButtonText={
            <FormattedMessage
              id="kbn.dashboard.listing.deleteSelectedDashboardsConfirmModal.confirmButtonLabel"
              defaultMessage="Delete"
            />
          }
          defaultFocusedButton="cancel"
        >
          <p>
            <FormattedMessage
              id="kbn.dashboard.listing.deleteDashboardsConfirmModalDescription"
              defaultMessage="You can't recover deleted dashboards."
            />
          </p>
        </EuiConfirmModal>
      </EuiOverlayMask>
    );
  }

  renderListingLimitWarning() {
    if (this.state.showLimitError) {
      return (
        <React.Fragment>
          <EuiCallOut
            title={
              <FormattedMessage
                id="kbn.dashboard.listing.listingLimitExceededTitle"
                defaultMessage="Listing limit exceeded"
              />
            }
            color="warning"
            iconType="help"
          >
            <p>
              <FormattedMessage
                id="kbn.dashboard.listing.listingLimitExceededDescription"
                defaultMessage="You have {totalDashboards} dashboards, but your {listingLimitText} setting prevents
                the table below from displaying more than {listingLimitValue}. You can change this setting under {advancedSettingsLink}."
                values={{
                  totalDashboards: this.state.totalDashboards,
                  listingLimitValue: this.props.listingLimit,
                  listingLimitText: (
                    <strong>
                      listingLimit
                    </strong>
                  ),
                  advancedSettingsLink: (
                    <EuiLink href="#/management/kibana/settings">
                      <FormattedMessage
                        id="kbn.dashboard.listing.listingLimitExceeded.advancedSettingsLinkText"
                        defaultMessage="Advanced Settings"
                      />
                    </EuiLink>
                  )
                }}
              />
            </p>
          </EuiCallOut>
          <EuiSpacer size="m" />
        </React.Fragment>
      );
    }
  }

  renderNoResultsMessage() {
    if (this.state.isFetchingItems) {
      return '';
    }

    return (
      <FormattedMessage
        id="kbn.dashboard.listing.noMatchedDashboardsMessage"
        defaultMessage="No dashboards matched your search."
      />
    );
  }

  renderNoItemsMessage() {

    if (this.props.hideWriteControls) {
      return (
        <EuiText>
          <h2>
            <EuiTextColor color="subdued">
              <FormattedMessage
                id="kbn.dashboard.listing.noDashboardsItemsMessage"
                defaultMessage="Looks like you don't have any dashboards."
              />
            </EuiTextColor>
          </h2>
        </EuiText>
      );
    }

    return (
      <div>
        <EuiEmptyPrompt
          iconType="dashboardApp"
          title={
            <h2>
              <FormattedMessage
                id="kbn.dashboard.listing.createNewDashboard.title"
                defaultMessage="Create your first dashboard"
              />
            </h2>
          }
          body={
            <Fragment>
              <p>
                <FormattedMessage
                  id="kbn.dashboard.listing.createNewDashboard.combineDataViewFromKibanaAppDescription"
                  defaultMessage="You can combine data views from any Kibana app into one dashboard and see everything in one place."
                />
              </p>
              <p>
                <FormattedMessage
                  id="kbn.dashboard.listing.createNewDashboard.newToKibanaDescription"
                  defaultMessage="New to Kibana? {sampleDataInstallLink} to take a test drive."
                  values={{
                    sampleDataInstallLink: (
                      <EuiLink href="#/home/tutorial_directory/sampleData">
                        <FormattedMessage
                          id="kbn.dashboard.listing.createNewDashboard.sampleDataInstallLinkText"
                          defaultMessage="Install some sample data"
                        />
                      </EuiLink>
                    ),
                  }}
                />
              </p>
            </Fragment>
          }
          actions={
            <EuiButton
              href={`#${DashboardConstants.CREATE_NEW_DASHBOARD_URL}`}
              fill
              iconType="plusInCircle"
              data-test-subj="createDashboardPromptButton"
            >
              <FormattedMessage
                id="kbn.dashboard.listing.createNewDashboard.createButtonLabel"
                defaultMessage="Create new dashboard"
              />
            </EuiButton>
          }
        />
      </div>
    );

  }

  renderSearchBar() {
    const { intl } = this.props;
    let deleteBtn;
    if (this.state.selectedIds.length > 0) {
      deleteBtn = (
        <EuiFlexItem grow={false}>
          <EuiButton
            color="danger"
            onClick={this.openDeleteModal}
            data-test-subj="deleteSelectedDashboards"
            key="delete"
          >
            <FormattedMessage
              id="kbn.dashboard.listing.searchBar.deleteSelectedButtonLabel"
              defaultMessage="Delete selected"
            />
          </EuiButton>
        </EuiFlexItem>
      );
    }

    return (
      <EuiFlexGroup>
        {deleteBtn}
        <EuiFlexItem grow={true}>
          <EuiFieldSearch
            aria-label={intl.formatMessage({
              id: 'kbn.dashboard.listing.searchBar.searchFieldAriaLabel',
              defaultMessage: 'Filter dashboards',
              description: '"Filter" is used as a verb here, similar to "search through dashboards".',
            })}
            placeholder={intl.formatMessage({
              id: 'kbn.dashboard.listing.searchBar.searchFieldPlaceholder',
              defaultMessage: 'Search…',
            })}
            fullWidth
            value={this.state.filter}
            onChange={(e) => this.setFilter(e.target.value)}
            data-test-subj="searchFilter"
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  renderTable() {
    const { intl } = this.props;
    const tableColumns = [
      {
        field: 'title',
        name: intl.formatMessage({
          id: 'kbn.dashboard.listing.table.titleColumnName',
          defaultMessage: 'Title',
        }),
        sortable: true,
        render: (field, record) => (
          <EuiLink
            href={`#${createDashboardEditUrl(record.id)}`}
            data-test-subj={`dashboardListingTitleLink-${record.title.split(' ').join('-')}`}
          >
            {field}
          </EuiLink>
        )
      },
      {
        field: 'description',
        name: intl.formatMessage({
          id: 'kbn.dashboard.listing.table.descriptionColumnName',
          defaultMessage: 'Description',
        }),
        dataType: 'string',
        sortable: true,
      }
    ];
    if (!this.props.hideWriteControls) {
      tableColumns.push({
        name: intl.formatMessage({
          id: 'kbn.dashboard.listing.table.actionsColumnName',
          defaultMessage: 'Actions',
        }),
        actions: [
          {
            render: (record) => {
              return (
                <EuiLink
                  href={`#${createDashboardEditUrl(record.id)}?_a=(viewMode:edit)`}
                >
                  <FormattedMessage
                    id="kbn.dashboard.listing.table.actionsColumn.editLinkText"
                    defaultMessage="Edit"
                  />
                </EuiLink>
              );
            }
          }
        ]
      });
    }
    const pagination = {
      pageIndex: this.state.page,
      pageSize: this.state.perPage,
      totalItemCount: this.state.dashboards.length,
      pageSizeOptions: [10, 20, 50],
    };
    const selection = {
      onSelectionChange: (selection) => {
        this.setState({
          selectedIds: selection.map(item => { return item.id; })
        });
      }
    };
    const sorting = {};
    if (this.state.sortField) {
      sorting.sort = {
        field: this.state.sortField,
        direction: this.state.sortDirection,
      };
    }
    const items = this.state.dashboards.length === 0 ? [] : this.getPageOfItems();

    return (
      <EuiBasicTable
        itemId={'id'}
        items={items}
        loading={this.state.isFetchingItems}
        columns={tableColumns}
        selection={selection}
        noItemsMessage={this.renderNoResultsMessage()}
        pagination={pagination}
        sorting={sorting}
        onChange={this.onTableChange}
      />
    );
  }

  renderListingOrEmptyState() {
    if (this.hasNoDashboards()) {
      return this.renderNoItemsMessage();
    }

    return this.renderListing();
  }

  renderListing() {
    let createButton;
    if (!this.props.hideWriteControls) {
      createButton = (
        <EuiFlexItem grow={false}>
          <EuiButton
            href={`#${DashboardConstants.CREATE_NEW_DASHBOARD_URL}`}
            data-test-subj="newDashboardLink"
            fill
          >
            <FormattedMessage
              id="kbn.dashboard.listing.createNewDashboardButtonLabel"
              defaultMessage="Create new dashboard"
            />
          </EuiButton>
        </EuiFlexItem>
      );
    }
    return (
      <div>
        {this.state.showDeleteModal && this.renderConfirmDeleteModal()}

        <EuiFlexGroup justifyContent="spaceBetween" alignItems="flexEnd" data-test-subj="top-nav">
          <EuiFlexItem grow={false}>
            <EuiTitle size="l">
              <h1>
                <FormattedMessage
                  id="kbn.dashboard.listing.dashboardsTitle"
                  defaultMessage="Dashboards"
                />
              </h1>
            </EuiTitle>
          </EuiFlexItem>

          {createButton}

        </EuiFlexGroup>

        <EuiSpacer size="m" />

        {this.renderListingLimitWarning()}

        {this.renderSearchBar()}

        <EuiSpacer size="m" />

        {this.renderTable()}
      </div>
    );
  }

  renderPageContent() {
    if (!this.state.hasInitialFetchReturned) {
      return;
    }

    return (
      <EuiPageContent horizontalPosition="center">
        {this.renderListingOrEmptyState()}
      </EuiPageContent>
    );
  }

  render() {
    return (
      <EuiPage data-test-subj="dashboardLandingPage" className="dshDashboardListing__page" restrictWidth>
        <EuiPageBody>
          {this.renderPageContent()}
        </EuiPageBody>
      </EuiPage>
    );
  }
}

DashboardListingUi.propTypes = {
  find: PropTypes.func.isRequired,
  delete: PropTypes.func.isRequired,
  listingLimit: PropTypes.number.isRequired,
  hideWriteControls: PropTypes.bool.isRequired,
  initialFilter: PropTypes.string,
};

DashboardListingUi.defaultProps = {
  initialFilter: EMPTY_FILTER,
};

export const DashboardListing = injectI18n(DashboardListingUi);

// The table supports three sort states:
// field-asc, field-desc, and default.
//
// If you click a non-default sort header three times,
// the sort returns to the default sort, described here.
function defaultSortOrder(filter) {
  // If the user has searched for something, we want our
  // default sort to be by Elasticsearch's relevance, so
  // we clear out our overriding sort options.
  if (filter.length > 0) {
    return { sortField: undefined, sortDirection: undefined };
  }

  return {
    sortField: 'title',
    sortDirection: 'asc',
  };
}
