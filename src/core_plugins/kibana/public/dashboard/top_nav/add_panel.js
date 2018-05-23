import './add_panel.less';
import React from 'react';
import PropTypes from 'prop-types';
import { toastNotifications } from 'ui/notify';
import { SavedObjectFinder } from 'ui/saved_objects/components/saved_object_finder';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiButton,
  EuiButtonIcon,
  EuiTabs,
  EuiTab,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';

const VIS_TAB_ID = 'vis';
const SAVED_SEARCH_TAB_ID = 'search';

export class DashboardAddPanel extends React.Component {
  constructor(props) {
    super(props);

    const addNewVisBtn = (
      <EuiButton
        onClick={this.props.addNewVis}
        data-test-subj="addNewSavedObjectLink"
      >
        Add new Visualization
      </EuiButton>
    );

    const tabs = [{
      id: VIS_TAB_ID,
      name: 'Visualization',
      dataTestSubj: 'addVisualizationTab',
      toastDataTestSubj: 'addVisualizationToDashboardSuccess',
      savedObjectFinder: (
        <SavedObjectFinder
          key="visSavedObjectFinder"
          callToActionButton={addNewVisBtn}
          onChoose={this.onAddPanel}
          find={this.props.find}
          noItemsMessage="No matching visualizations found."
          savedObjectType="visualization"
        />
      )
    }, {
      id: SAVED_SEARCH_TAB_ID,
      name: 'Saved Search',
      dataTestSubj: 'addSavedSearchTab',
      toastDataTestSubj: 'addSavedSearchToDashboardSuccess',
      savedObjectFinder: (
        <SavedObjectFinder
          key="searchSavedObjectFinder"
          onChoose={this.onAddPanel}
          find={this.props.find}
          noItemsMessage="No matching saved searches found."
          savedObjectType="search"
        />
      )
    }];

    this.state = {
      tabs: tabs,
      selectedTab: tabs[0],
    };
  }

  onSelectedTabChanged = tab => {
    this.setState({
      selectedTab: tab,
    });
  }

  renderTabs() {
    return this.state.tabs.map((tab) => {
      return (
        <EuiTab
          onClick={() => this.onSelectedTabChanged(tab)}
          isSelected={tab.id === this.state.selectedTab.id}
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

    // To avoid the clutter of having toast messages cover flyout
    // close previous toast message before creating a new one
    if (this.lastToast) {
      toastNotifications.remove(this.lastToast);
    }

    this.lastToast = toastNotifications.addSuccess({
      title: `${this.state.selectedTab.name} was added to your dashboard`,
      'data-test-subj': this.state.selectedTab.toastDataTestSubj,
    });
  }

  render() {
    return (
      <EuiFlyout
        ownFocus
        className="addPanelFlyout"
        onClose={this.props.onClose}
        size="s"
        data-test-subj="dashboardAddPanel"
      >
        <EuiFlyoutBody>

          <EuiFlexGroup>
            <EuiFlexItem>
              <EuiTitle>
                <h2>Add Panels</h2>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonIcon
                iconType="cross"
                onClick={this.props.onClose}
                aria-label="close add panel"
                data-test-subj="closeAddPanelBtn"
              />
            </EuiFlexItem>
          </EuiFlexGroup>

          <EuiTabs>
            {this.renderTabs()}
          </EuiTabs>

          <EuiSpacer size="s" />

          {this.state.selectedTab.savedObjectFinder}

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
