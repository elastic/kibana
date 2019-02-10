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

import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import _ from 'lodash';
import { injectI18n, FormattedMessage } from '@kbn/i18n/react';

import { toastNotifications } from 'ui/notify';

import {
  EuiIcon,
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

class VisualizeListingTableUi extends Component {

  constructor(props) {
    super(props);

    this.state = {
      ...defaultSortOrder(this.props.initialFilter),
      hasInitialFetchReturned: false,
      isFetchingItems: false,
      showDeleteModal: false,
      showLimitError: false,
      filter: this.props.initialFilter,
      items: [],
      selectedIds: [],
      totalItems: 0,
      page: 0,
      perPage: 20,
      filter: ''
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
    const response = await this.props.fetchItems(filter);

    if (!this._isMounted) {
      return;
    }

    // We need this check to handle the case where search results come back in a different
    // order than they were sent out. Only load results for the most recent search.
    if (filter === this.state.filter) {
      this.setState({
        hasInitialFetchReturned: true,
        isFetchingItems: false,
        items: response,
        totalItems: response.length,
        showLimitError: response.length > this.props.listingLimit,
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
            id="kbn.visualize.listing.unableToDeleteVisualizationsDangerMessage"
            defaultMessage="Unable to delete visualization(s)"
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

  deselectAll = () => {
    this.setState({ selectedIds: [] });
  };

  // server-side paging not supported - see component comment for details
  getPageOfItems = () => {
    // do not sort original list to preserve elasticsearch ranking order
    const itemsCopy = this.state.items.slice();

    if (this.state.sortField) {
      itemsCopy.sort((a, b) => {
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
    return itemsCopy.slice(startIndex, lastIndex);
  }

  hasNoItems() {
    if (!this.state.isFetchingItems && this.state.items.length === 0 && !this.state.filter) {
      return true;
    }

    return false;
  }

  renderListingLimitWarning() {
    if (this.state.showLimitError) {
      return (
        <React.Fragment>
          <EuiCallOut
            title={
              <FormattedMessage
                id="kbn.visualization.listing.listingLimitExceededTitle"
                defaultMessage="Listing limit exceeded"
              />
            }
            color="warning"
            iconType="help"
          >
            <p>
              <FormattedMessage
                id="kbn.visualization.listing.listingLimitExceededDescription"
                defaultMessage="You have {totalItems} visualizations, but your {listingLimitText} setting prevents
                the table below from displaying more than {listingLimitValue}. You can change this setting under {advancedSettingsLink}."
                values={{
                  totalItems: this.state.totalItems,
                  listingLimitValue: this.props.listingLimit,
                  listingLimitText: (
                    <strong>
                      listingLimit
                    </strong>
                  ),
                  advancedSettingsLink: (
                    <EuiLink href="#/management/kibana/settings">
                      <FormattedMessage
                        id="kbn.visualization.listing.listingLimitExceeded.advancedSettingsLinkText"
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
        id="kbn.visualization.listing.noMatchedVisualizationsMessage"
        defaultMessage="No visualizations matched your search."
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
                id="kbn.dashboard.listing.noVisualizationsItemsMessage"
                defaultMessage="Looks like you don't have any visualizations."
              />
            </EuiTextColor>
          </h2>
        </EuiText>
      );
    }

    return (
      <div>
        <EuiEmptyPrompt
          iconType="visualizeApp"
          title={
            <h2>
              <FormattedMessage
                id="kbn.dashboard.listing.createNewVisualization.title"
                defaultMessage="Create your first visualization"
              />
            </h2>
          }
          body={
            <Fragment>
              <p>
                <FormattedMessage
                  id="kbn.dashboard.listing.createNewVisualization.description"
                  defaultMessage="You can combine data views from any Kibana app into one dashboard and see everything in one place."
                />
              </p>
            </Fragment>
          }
          actions={
            <EuiButton
              onClick={this.props.onCreateVis}
              fill
              iconType="plusInCircle"
              data-test-subj="createVisualizationPromptButton"
            >
              <FormattedMessage
                id="kbn.dashboard.listing.createNewVisualization.createButtonLabel"
                defaultMessage="Create new visualization"
              />
            </EuiButton>
          }
        />
      </div>
    );

  }

  getUrlForItem(item) {
    return `#/visualize/edit/${item.id}`;
  }

  renderItemTypeIcon(item) {
    let icon;
    if (item.type.image) {
      icon = (
        <img
          className="visListingTable__typeImage"
          aria-hidden="true"
          alt=""
          src={item.type.image}
        />
      );
    } else {
      icon = (
        <EuiIcon
          className="visListingTable__typeIcon"
          aria-hidden="true"
          type={item.icon || 'empty'}
          size="m"
        />
      );
    }

    return icon;
  }

  renderFlaskIcon(item) {
    let flaskHolder;
    if (item.type.shouldMarkAsExperimentalInUI()) {
      flaskHolder =  (
        <EuiIcon
          className="visListingTable__typeIcon"
          aria-hidden="true"
          type="beaker"
          size="m"
        />
      );
    }else{
      flaskHolder = <span />;
    }
    return flaskHolder;
  }

  createRows() {
    return this.state.pageOfItems.map(item => ({
      id: item.id,
      cells: this.renderRowCells(item)
    }));
  }

  renderConfirmDeleteModal() {
    return (
      <EuiOverlayMask>
        <EuiConfirmModal
          title={
            <FormattedMessage
              id="kbn.visualization.listing.deleteSelectedVisualizationsConfirmModal.title"
              defaultMessage="Delete selected visualizations?"
            />
          }
          onCancel={this.closeDeleteModal}
          onConfirm={this.deleteSelectedItems}
          cancelButtonText={
            <FormattedMessage
              id="kbn.dasvisualizationhboard.listing.deleteSelectedVisualizationsConfirmModal.cancelButtonLabel"
              defaultMessage="Cancel"
            />
          }
          confirmButtonText={
            <FormattedMessage
              id="kbn.visualization.listing.deleteSelectedVisualizationsConfirmModal.confirmButtonLabel"
              defaultMessage="Delete"
            />
          }
          defaultFocusedButton="cancel"
        >
          <p>
            <FormattedMessage
              id="kbn.visualization.listing.deleteVisualizationsConfirmModalDescription"
              defaultMessage="You can't recover deleted visualizations."
            />
          </p>
        </EuiConfirmModal>
      </EuiOverlayMask>
    );
  }

  onDelete = () => {
    this.setState({ showDeleteModal: true });
  };

  deleteSelectedItems = () => {
    this.props.deleteSelectedItems(this.state.selectedIds)
      .then(() => this.fetchItems(this.state.filter))
      .catch(() => {})
      .then(() => this.deselectAll())
      .then(() => this.closeDeleteModal());
  };

  onItemSelectionChanged = (newSelectedIds) => {
    this.setState({ selectedIds: newSelectedIds });
  };

  onCreate = () => {
    this.props.onCreateVis();
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

  renderNoResultsMessage() {
    if (this.state.isFetchingItems) {
      return '';
    }

    return (
      <FormattedMessage
        id="kbn.visualize.listing.noMatchedVisualizationsMessage"
        defaultMessage="No visualizations matched your search."
      />
    );
  }

  renderTable() {
    const { intl } = this.props;
    const tableColumns = [
      {
        field: 'title',
        name: intl.formatMessage({
          id: 'kbn.visualize.listing.table.titleColumnName',
          defaultMessage: 'Title',
        }),
        sortable: true,
        render: (field, record) => (
          <span>
            {this.renderFlaskIcon(record)}
            <EuiLink
              href={`#${this.getUrlForItem(record.id)}`}
              data-test-subj={`visListingTitleLink-${record.title.split(' ').join('-')}`}
            >
              {field}
            </EuiLink>
          </span>
        )
      },
      {
        field: 'type.title',
        name: intl.formatMessage({
          id: 'kbn.visualize.listing.table.typeColumnName',
          defaultMessage: 'Type',
        }),
        sortable: true,
        render: (field, record) =>  (
          <span>
            {this.renderItemTypeIcon(record)}
            {record.type.title}
          </span>
        )
      }
    ];
    const pagination = {
      pageIndex: this.state.page,
      pageSize: this.state.perPage,
      totalItemCount: this.state.items.length,
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
    const items = this.state.items.length === 0 ? [] : this.getPageOfItems();

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

  renderSearchBar() {
    const { intl } = this.props;
    let deleteBtn;
    if (this.state.selectedIds.length > 0) {
      deleteBtn = (
        <EuiFlexItem grow={false}>
          <EuiButton
            color="danger"
            onClick={this.openDeleteModal}
            data-test-subj="deleteSelectedVisualizations"
            key="delete"
          >
            <FormattedMessage
              id="kbn.visualization.listing.searchBar.deleteSelectedButtonLabel"
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
              id: 'kbn.visualization.listing.searchBar.searchFieldAriaLabel',
              defaultMessage: 'Filter visualizations',
              description: '"Filter" is used as a verb here, similar to "search through visualizations".',
            })}
            placeholder={intl.formatMessage({
              id: 'kbn.visualization.listing.searchBar.searchFieldPlaceholder',
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


  renderListingOrEmptyState() {
    if (this.hasNoItems()) {
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
            onClick={this.props.onCreateVis}
            data-test-subj="newVisualizationLink"
            fill
          >
            <FormattedMessage
              id="kbn.visualization.listing.createNewButtonLabel"
              defaultMessage="Create new visualization"
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
                  id="kbn.visualization.listing.title"
                  defaultMessage="Visualizations"
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
      <EuiPage data-test-subj="visualizationLandingPage" className="dshVisualizationListing__page" restrictWidth>
        <EuiPageBody>
          {this.renderPageContent()}
        </EuiPageBody>
      </EuiPage>
    );
  }


}



VisualizeListingTableUi.propTypes = {
  deleteSelectedItems: PropTypes.func,
  fetchItems: PropTypes.func,
  onCreateVis: PropTypes.func.isRequired,
};

export const VisualizeListingTable = injectI18n(VisualizeListingTableUi);

// The table supports three sort states:
// field-asc, field-desc, and default.
//
// If you click a non-default sort header three times,
// the sort returns to the default sort, described here.
function defaultSortOrder(filter) {
  // If the user has searched for something, we want our
  // default sort to be by Elasticsearch's relevance, so
  // we clear out our overriding sort options.
  if (filter && filter.length > 0) {
    return { sortField: undefined, sortDirection: undefined };
  }

  return {
    sortField: 'title',
    sortDirection: 'asc',
  };
}
