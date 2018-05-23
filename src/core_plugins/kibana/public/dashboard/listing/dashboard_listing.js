import React from 'react';
import PropTypes from 'prop-types';
import _ from 'lodash';
import { toastNotifications } from 'ui/notify';
import {
  EuiTitle,
  EuiFieldSearch,
  EuiBasicTable,
  EuiPage,
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
} from '@elastic/eui';
import { DashboardConstants, createDashboardEditUrl } from '../dashboard_constants';

export const EMPTY_FILTER = '';

// saved object client does not support sorting by title because title is only mapped as analyzed
// the legacy implementation got around this by pulling `listingLimit` items and doing client side sorting
// and not supporting server-side paging.
// This component does not try to tackle these problems (yet) and is just feature matching the legacy component
// TODO support server side sorting/paging once title and description are sortable on the server.
export class DashboardListing extends React.Component {

  constructor(props) {
    super(props);

    this.state = {
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
        title: `Unable to delete dashboard(s)`,
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

  onTableChange = ({ page, sort = {} }) => {
    const {
      index: pageIndex,
      size: pageSize,
    } = page;

    let {
      field: sortField,
      direction: sortDirection,
    } = sort;

    // 3rd sorting state that is not captured by sort - native order (no sort)
    // when switching from desc to asc for the same field - use native order
    if (this.state.sortField === sortField
      && this.state.sortDirection === 'desc'
      && sortDirection === 'asc') {
      sortField = null;
      sortDirection = null;
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

  renderConfirmDeleteModal() {
    return (
      <EuiOverlayMask>
        <EuiConfirmModal
          title="Delete selected dashboards?"
          onCancel={this.closeDeleteModal}
          onConfirm={this.deleteSelectedItems}
          cancelButtonText="Cancel"
          confirmButtonText="Delete"
          defaultFocusedButton="cancel"
        >
          <p>{`You can't recover deleted dashboards.`}</p>
        </EuiConfirmModal>
      </EuiOverlayMask>
    );
  }

  renderListingLimitWarning() {
    if (this.state.showLimitError) {
      return (
        <React.Fragment>
          <EuiCallOut
            title="Listing limit exceeded"
            color="warning"
            iconType="help"
          >
            <p>
              You have {this.state.totalDashboards} dashboards,
              but your <strong>listingLimit</strong> setting prevents the table below from displaying more than {this.props.listingLimit}.
              You can change this setting under <EuiLink href="#/management/kibana/settings">Advanced Settings</EuiLink>.
            </p>
          </EuiCallOut>
          <EuiSpacer size="m" />
        </React.Fragment>
      );
    }
  }

  renderNoItemsMessage() {
    if (this.state.isFetchingItems) {
      return '';
    }

    if (!this.state.isFetchingItems && this.state.dashboards.length === 0 && !this.state.filter) {
      if (this.props.hideWriteControls) {
        return (
          <EuiText>
            <h2>
              <EuiTextColor color="subdued">
                {`Looks like you don't have any dashboards.`}
              </EuiTextColor>
            </h2>
          </EuiText>
        );
      }

      return (
        <React.Fragment>
          <EuiText>
            <h2>
              <EuiTextColor color="subdued">
                {`Looks like you don't have any dashboards. Let's create some!`}
              </EuiTextColor>
            </h2>
          </EuiText>
          <EuiButton
            href={`#${DashboardConstants.CREATE_NEW_DASHBOARD_URL}`}
            fill
            iconType="plusInCircle"
            data-test-subj="createDashboardPromptButton"
          >
            Create new dashboard
          </EuiButton>
        </React.Fragment>
      );
    }

    return 'No dashboards matched your search.';
  }

  renderSearchBar() {
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
            Delete selected
          </EuiButton>
        </EuiFlexItem>
      );
    }

    return (
      <EuiFlexGroup>
        {deleteBtn}
        <EuiFlexItem grow={true}>
          <EuiFieldSearch
            placeholder="Search..."
            fullWidth
            value={this.state.filter}
            onChange={(e) => {
              this.setState({
                filter: e.target.value
              }, this.fetchItems);
            }}
            data-test-subj="searchFilter"
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  renderTable() {
    const tableColumns = [
      {
        field: 'title',
        name: 'Title',
        sortable: true,
        render: (field, record) => (
          <EuiLink
            className="dashboardLink"
            href={`#${createDashboardEditUrl(record.id)}`}
            data-test-subj={`dashboardListingTitleLink-${record.title.split(' ').join('-')}`}
          >
            {field}
          </EuiLink>
        )
      },
      {
        field: 'description',
        name: 'Description',
        dataType: 'string',
        sortable: true,
      }
    ];
    if (!this.props.hideWriteControls) {
      tableColumns.push({
        name: 'Actions',
        actions: [
          {
            render: (record) => {
              return (
                <EuiLink
                  href={`#${createDashboardEditUrl(record.id)}?_a=(viewMode:edit)`}
                >
                  Edit
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
        noItemsMessage={this.renderNoItemsMessage()}
        pagination={pagination}
        sorting={sorting}
        onChange={this.onTableChange}
      />
    );
  }

  render() {
    let createButton;
    if (!this.props.hideWriteControls) {
      createButton = (
        <EuiFlexItem grow={false}>
          <EuiButton
            href={`#${DashboardConstants.CREATE_NEW_DASHBOARD_URL}`}
            data-test-subj="newDashboardLink"
          >
            Create new dashboard
          </EuiButton>
        </EuiFlexItem>
      );
    }
    return (
      <EuiPage data-test-subj="dashboardLandingPage">

        {this.state.showDeleteModal && this.renderConfirmDeleteModal()}

        <EuiFlexGroup justifyContent="spaceBetween" alignItems="flexEnd" data-test-subj="top-nav">
          <EuiFlexItem grow={false}>
            <EuiTitle size="l">
              <h1>
                Dashboard
              </h1>
            </EuiTitle>
          </EuiFlexItem>

          {createButton}

        </EuiFlexGroup>

        <EuiSpacer size="m" />

        {this.renderListingLimitWarning()}

        {this.renderSearchBar()}

        {this.renderTable()}

      </EuiPage>
    );
  }
}

DashboardListing.propTypes = {
  find: PropTypes.func.isRequired,
  delete: PropTypes.func.isRequired,
  listingLimit: PropTypes.number.isRequired,
  hideWriteControls: PropTypes.bool.isRequired,
  initialFilter: PropTypes.string,
};

DashboardListing.defaultProps = {
  initialFilter: EMPTY_FILTER,
};
