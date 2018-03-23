import _ from 'lodash';
import React from 'react';
import PropTypes from 'prop-types';
import { toastNotifications } from 'ui/notify';

import {
  EuiFlyout,
  EuiFlyoutBody,
  EuiButton,
  EuiTabs,
  EuiTab,
  EuiSearchBar,
  EuiBasicTable,
  EuiSpacer,
  EuiLink,
} from '@elastic/eui';

const VIS_TAB_ID = 'vis';
const SAVED_SEARCH_TAB_ID = 'search';

export class DashboardAddPanel extends React.Component {
  constructor(props) {
    super(props);

    this.tabs = [{
      id: VIS_TAB_ID,
      name: 'Visualization',
      dataTestSubj: 'addVisualizationTab',
      toastDataTestSubj: 'addVisualizationToDashboardSuccess',
    }, {
      id: SAVED_SEARCH_TAB_ID,
      name: 'Saved Search',
      dataTestSubj: 'addSavedSearchTab',
      toastDataTestSubj: 'addSavedSearchToDashboardSuccess',
    }];

    this.state = {
      selectedTabId: VIS_TAB_ID,
      items: [],
      isFetchingItems: false,
      page: 1,
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

  onTableChange = ({ page }) => {
    this.setState({
      page: page.index,
      perPage: page.pageSize,
    });
  }

  getSavedObjectType = () => {
    if (this.state.selectedTabId === VIS_TAB_ID) {
      return 'visualization';
    }

    return 'search';
  }

  debouncedFetch = _.debounce(async (filter) => {
    const response = await this.props.find(
      this.getSavedObjectType(),
      filter,
      this.state.page,
      this.state.perPage);

    if (!this._isMounted) {
      return;
    }

    // We need this check to handle the case where search results come back in a different
    // order than they were sent out. Only load results for the most recent search.
    if (filter === this.state.filter) {
      this.setState({
        isFetchingItems: false,
        items: response.savedObjects.map(savedObject => {
          return {
            title: savedObject.attributes.title,
            id: savedObject.id,
            type: savedObject.type,
          };
        }),
        totalItems: response.total,
      });
    }
  }, 300);

  fetchItems = () => {
    this.setState({
      isFetchingItems: true,
    }, this.debouncedFetch.bind(null, this.state.filter));
  }


  onSelectedTabChanged = id => {
    this.setState({
      selectedTabId: id,
      filter: undefined,
    }, this.fetchItems);
  }

  renderTabs() {
    return this.tabs.map((tab) => {
      return (
        <EuiTab
          onClick={() => this.onSelectedTabChanged(tab.id)}
          isSelected={tab.id === this.state.selectedTabId}
          key={tab.id}
          data-test-subj={tab.dataTestSubj}
        >
          {tab.name}
        </EuiTab>
      );
    });
  }

  onAddPanel = (id, type) => {
    this.props.addNewPanel(id, type);

    const selectedTab = this.tabs.find((tab) => {
      return tab.id === this.state.selectedTabId;
    });
    toastNotifications.addSuccess({
      title: `${selectedTab.name} was added to your dashboard`,
      'data-test-subj': selectedTab.toastDataTestSubj,
    });
  }

  renderSearchBar() {
    return (
      <EuiSearchBar
        onChange={(query) => {
          this.setState({
            filter: query.text
          }, this.fetchItems);
        }}
        box={{ incremental: true, ['data-test-subj']: 'savedObjectFinderSearchInput' }}
      />
    );
  }

  renderTable() {
    const pagination = {
      pageIndex: this.state.page,
      pageSize: this.state.perPage,
      totalItemCount: this.state.items.length,
      pageSizeOptions: [10, 20, 50],
    };
    const tableColumns = [
      {
        field: 'title',
        name: 'Title',
        render: (field, record) => (
          <EuiLink
            onClick={() => {
              this.onAddPanel(record.id, record.type);
            }}
          >
            {field}
          </EuiLink>
        )
      }
    ];
    return (
      <EuiBasicTable
        items={this.state.items}
        loading={this.state.isFetchingItems}
        columns={tableColumns}
        pagination={pagination}
        onChange={this.onTableChange}
      />
    );
  }

  render() {
    return (
      <EuiFlyout
        onClose={this.props.onClose}
        size="s"
      >
        <EuiFlyoutBody>

          <EuiButton
            iconType="cross"
            onClick={this.props.onClose}
          >
            Close
          </EuiButton>

          <EuiTabs>
            {this.renderTabs()}
          </EuiTabs>

          <EuiSpacer size="s" />

          {this.renderSearchBar()}
          {this.renderTable()}

        </EuiFlyoutBody>
      </EuiFlyout>
    );
  }
}

DashboardAddPanel.propTypes = {
  onClose: PropTypes.func.isRequired,
  find: PropTypes.func.isRequired,
  addNewPanel: PropTypes.func.isRequired,
  addNewVis: PropTypes.func.isRequired,
};
