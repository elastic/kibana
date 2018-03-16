import React from 'react';
import PropTypes from 'prop-types';
import _ from 'lodash';
import { toastNotifications } from 'ui/notify';
import {
  EuiTitle,
  EuiInMemoryTable,
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

const tableColumns = [
  {
    field: 'title',
    name: 'Title',
    sortable: true,
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
    name: 'Description',
    dataType: 'string',
    sortable: true
  }
];

export const EMPTY_FILTER = '';

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

  debouncedFetch = _.debounce(async () => {
    const response = await this.props.find(this.state.filter);

    if (!this._isMounted) {
      return;
    }

    this.setState({
      isFetchingItems: false,
      dashboards: response.hits,
      totalDashboards: response.total,
      showLimitError: response.total > this.props.listingLimit,
    });
  }, 300);

  fetchItems = () => {
    this.setState({
      isFetchingItems: true,
    }, this.debouncedFetch);
  }

  deleteSelectedItems = async () => {
    try {
      await this.props.delete(this.state.selectedIds);
    } catch (error) {
      toastNotifications.addWarning({
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

  hasFilter = () => {
    return this.state.filter !== EMPTY_FILTER;
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

  renderDeleteButton() {
    if (this.state.selectedIds.length === 0) {
      return;
    }

    return (
      <EuiButton
        color="danger"
        onClick={this.openDeleteModal}
        data-test-subj="deleteSelectedDashboards"
      >
        Delete selected
      </EuiButton>
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

  shouldFetch(newFilter, oldFilter) {
    return !newFilter.includes(oldFilter);
  }

  renderMessage() {
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

  renderTable() {
    const search = {
      defaultQuery: this.props.initialFilter,
      toolsLeft: this.renderDeleteButton(),
      box: {
        incremental: true,
        ['data-test-subj']: 'searchFilter'
      },
      onChange: (query) => {
        if (this.state.showLimitError || this.shouldFetch(query.text, this.state.filter)) {
          this.setState({
            filter: query.text
          }, this.fetchItems);
        }
        return true;
      }
    };
    const selection = {
      itemId: 'id',
      onSelectionChange: (selection) => {
        this.setState({
          selectedIds: selection.map(item => { return item.id; })
        });
      }
    };
    return (
      <EuiInMemoryTable
        items={this.state.dashboards}
        loading={this.state.isFetchingItems}
        columns={tableColumns}
        sorting={true}
        pagination={true}
        selection={selection}
        search={search}
        message={this.renderMessage()}
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
